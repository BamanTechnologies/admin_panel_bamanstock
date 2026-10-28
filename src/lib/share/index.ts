/**
 * Sharing a generated PDF: upload the bytes to Cloudinary through the Hasura
 * `upload_files` action, then hand out Telegram / WhatsApp share links.
 */

import { getAdminClient } from "$graphql/client";
import UPLOAD_FILE from "$graphql/mutation/file/upload.gql";

export type ShareTarget = "telegram" | "whatsapp";

const CHUNK = 0x8000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Uploads a PDF through the same `upload_files` mutation the file picker uses
 * and returns the public Cloudinary URL.
 */
export async function uploadPdf(
  bytes: Uint8Array,
  folder = "invoices"
): Promise<string> {
  const result = await getAdminClient().mutate<{
    upload_files: { secure_url: string }[];
  }>({
    mutation: UPLOAD_FILE,
    variables: {
      files: [
        {
          type: "application/pdf",
          folder,
          base64String: bytesToBase64(bytes),
        },
      ],
    },
  });

  const url = result.data?.upload_files?.[0]?.secure_url ?? "";
  if (!url) throw new Error("The upload did not return a file URL.");
  return url;
}

export function telegramShareLink(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function whatsappShareLink(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function shareLink(
  target: ShareTarget,
  url: string,
  text: string
): string {
  return target === "telegram"
    ? telegramShareLink(url, text)
    : whatsappShareLink(url, text);
}

/**
 * Copies text to the clipboard. `navigator.clipboard` needs a secure context,
 * so a hidden textarea is used as a fallback (e.g. plain-http deployments).
 */
export async function copyText(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy failed");
  } finally {
    document.body.removeChild(area);
  }
}
