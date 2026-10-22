/**
 * Invoice PDF generation.
 *
 * The invoice sheet in the admin panel is a Svelte component, so printing it
 * through the browser produces a page that carries the app chrome and breaks
 * awkwardly. pdfmake renders the same content straight into a paginated PDF
 * document, which gives a clean, branded file the user can hand to a customer.
 *
 * The library and its fonts are loaded on demand (dynamic import) so the
 * ~2 MB of pdfmake + Roboto never lands in the initial bundle.
 */

import {
  formatCurrency,
  formatDate,
  frequencyLabel,
  paymentStatusLabel,
  type BillingInvoice,
} from "./index.js";

const BRAND = "#4D8DEE";
const BRAND_DARK = "#2F6FD0";
const INK = "#111827";
const BODY = "#374151";
const MUTED = "#6B7280";
const LINE = "#E5E7EB";
const SOFT = "#F3F4F6";

type PdfCell = Record<string, unknown>;

function text(value: string | number | null | undefined, fallback = "—"): string {
  const trimmed = (value ?? "").toString().trim();
  return trimmed.length ? trimmed : fallback;
}

/** Left label / right value pair used in the party and meta blocks. */
function labeled(label: string, value: string): PdfCell {
  return {
    stack: [
      { text: label, style: "caption" },
      { text: value, style: "metaValue", margin: [0, 2, 0, 0] },
    ],
  };
}

function totalsRow(label: string, value: string, style = "totalLabel"): PdfCell[] {
  return [{ text: label, style }, { text: value, style, alignment: "right" }];
}

/**
 * Builds the pdfmake document definition for an invoice.
 */
export function invoiceDocument(invoice: BillingInvoice): Record<string, unknown> {
  const plan = invoice.pricing_plan_frequency_price;
  const company = invoice.company;
  const itemTitle = `${plan?.pricing_plan?.name ?? "Subscription"} · ${frequencyLabel(
    plan?.frequency
  )}`;
  const itemNote = invoice.reason ?? plan?.pricing_plan?.description ?? "Subscription payment";
  const unitPrice = Number(plan?.price ?? invoice.subtotal);

  const receiptUrl = invoice.payment?.reference_file ?? null;

  return {
    pageSize: "A4",
    pageMargins: [38, 32, 38, 46],
    defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.35, color: BODY },
    styles: {
      brandName: { fontSize: 16, bold: true, color: "#FFFFFF", characterSpacing: 0.6 },
      brandTag: { fontSize: 8.5, color: "#E8F0FE", margin: [0, 2, 0, 0] },
      invoiceTitle: { fontSize: 19, bold: true, color: "#FFFFFF", characterSpacing: 2 },
      invoiceNo: { fontSize: 9.5, color: "#E8F0FE", margin: [0, 3, 0, 0] },
      caption: { fontSize: 7.5, bold: true, color: MUTED, characterSpacing: 0.8 },
      metaValue: { fontSize: 9.5, bold: true, color: INK },
      sectionTitle: { fontSize: 8, bold: true, color: MUTED, characterSpacing: 1 },
      th: { fontSize: 8, bold: true, color: INK, characterSpacing: 0.6 },
      td: { fontSize: 9.5, color: BODY },
      tdStrong: { fontSize: 9.5, bold: true, color: INK },
      totalLabel: { fontSize: 9.5, color: BODY },
      totalValue: { fontSize: 9.5, bold: true, color: INK },
      grandLabel: { fontSize: 12, bold: true, color: INK },
      grandValue: { fontSize: 12, bold: true, color: BRAND_DARK },
      note: { fontSize: 8.5, color: MUTED },
      link: { fontSize: 8, color: BRAND_DARK },
    },
    content: [
      // NOTE: pdfmake 0.3 reads the table `layout` from the node that owns
      // `table`, not from the table object itself. Keeping `layout` inside
      // `table: { ... }` silently drops every fill, rule and padding.
      // ---------- Brand header ----------
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              { text: "BAMANSTOCK", style: "brandName" },
              { text: "INVOICE", style: "invoiceTitle", alignment: "right" },
            ],
            [
              { text: "Logistics & Supply Platform", style: "brandTag" },
              {
                text: invoice.invoice_number,
                style: "invoiceNo",
                alignment: "right",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 12,
          paddingBottom: () => 12,
          paddingLeft: () => 14,
          paddingRight: () => 14,
          fillColor: () => BRAND,
        },
        margin: [0, 0, 0, 16],
      },

      // ---------- Meta strip ----------
      {
        table: {
          widths: ["*", "*", "*"],
          body: [
            [
              labeled("ISSUE DATE", formatDate(invoice.created_at)),
              labeled(
                "SERVICE PERIOD",
                `${formatDate(invoice.start_date)}  —  ${formatDate(invoice.end_date)}`
              ),
              labeled(
                "STATUS",
                paymentStatusLabel(invoice.payment?.payment_status).toUpperCase()
              ),
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 9,
          paddingBottom: () => 9,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          fillColor: () => SOFT,
        },
        margin: [0, 0, 0, 18],
      },

      // ---------- Parties ----------
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "BILLED TO", style: "sectionTitle" },
              { text: text(company?.name), style: "tdStrong", margin: [0, 6, 0, 0] },
              { text: `TIN: ${text(invoice.tin_number ?? company?.tin_number)}`, style: "note", margin: [0, 3, 0, 0] },
              { text: `License: ${text(company?.license)}`, style: "note", margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "PAYMENT DETAILS", style: "sectionTitle" },
              {
                text: `Method: ${text(
                  (invoice.payment?.payment_method ?? "").replace(/_/g, " "),
                  "—"
                ).toLowerCase()}`,
                style: "td",
                margin: [0, 6, 0, 0],
              },
              { text: `Transaction: ${text(invoice.transaction_id ?? invoice.payment?.transaction_id)}`, style: "note", margin: [0, 3, 0, 0] },
              { text: `Paid on: ${formatDate(invoice.payment?.payment_date)}`, style: "note", margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 18],
      },

      // ---------- Line items ----------
      {
        table: {
          widths: ["*", 34, 84, 88],
          body: [
            [
              { text: "DESCRIPTION", style: "th" },
              { text: "QTY", style: "th", alignment: "right" },
              { text: "UNIT PRICE", style: "th", alignment: "right" },
              { text: "AMOUNT", style: "th", alignment: "right" },
            ],
            [
              {
                stack: [
                  { text: itemTitle, style: "tdStrong" },
                  { text: itemNote, style: "note", margin: [0, 2, 0, 0] },
                ],
              },
              { text: "1", style: "td", alignment: "right" },
              { text: formatCurrency(unitPrice), style: "td", alignment: "right" },
              { text: formatCurrency(invoice.subtotal), style: "tdStrong", alignment: "right" },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => LINE,
          paddingTop: () => 9,
          paddingBottom: () => 9,
          paddingLeft: () => 10,
          paddingRight: () => 10,
          fillColor: (i: number) => (i === 0 ? "#EEF3FC" : "#FFFFFF"),
        },
        margin: [0, 0, 0, 16],
      },

      // ---------- Totals ----------
      {
        table: {
          widths: ["*", 200],
          body: [
            [
              {
                stack: [
                  {
                    text: "Thank you for your business. This invoice was generated automatically from an approved payment.",
                    style: "note",
                    margin: [0, 0, 12, 0],
                  },
                  ...(receiptUrl
                    ? [
                        {
                          text: "Receipt",
                          style: "caption",
                        },
                        {
                          text: receiptUrl,
                          link: receiptUrl,
                          style: "link",
                          margin: [0, 2, 0, 0],
                        },
                      ]
                    : []),
                ],
              },
              {
                stack: [
                  {
                    table: {
                      widths: ["*", "auto"],
                      body: [
                        totalsRow("Subtotal", formatCurrency(invoice.subtotal)),
                        totalsRow("VAT (15%)", formatCurrency(invoice.vat)),
                        totalsRow("Withholding (2%)", formatCurrency(invoice.withholding)),
                        [
                          { text: "Total due", style: "grandLabel", margin: [0, 6, 0, 0] },
                          {
                            text: formatCurrency(invoice.total),
                            style: "grandValue",
                            alignment: "right",
                            margin: [0, 6, 0, 0],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: (i: number) => (i === 3 ? 0.8 : 0),
                      vLineWidth: () => 0,
                      hLineColor: () => LINE,
                      paddingTop: () => 4,
                      paddingBottom: () => 4,
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                    },
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 0],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          width: "*",
          text: `Generated by BamanStock · ${formatDate(new Date().toISOString())}`,
          style: "note",
          alignment: "left",
        },
        {
          width: "auto",
          text: `Page ${currentPage} of ${pageCount}`,
          style: "note",
          alignment: "right",
        },
      ],
      margin: [38, 14, 38, 0],
    }),
    info: { title: `${invoice.invoice_number} · BamanStock invoice` },
  };
}

/**
 * Renders the invoice and hands the file to the browser.
 * Returns the file name that was downloaded.
 */
export async function downloadInvoicePdf(invoice: BillingInvoice): Promise<string> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  pdfMake.addVirtualFileSystem(vfs);

  const filename = `invoice-${invoice.invoice_number}.pdf`;
  pdfMake.createPdf(invoiceDocument(invoice)).download(filename);
  return filename;
}
