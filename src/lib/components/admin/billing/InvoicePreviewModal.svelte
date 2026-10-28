<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Icon from "$lib/components/ui/Icon/index.js";
  import {
    formatCurrency,
    formatDate,
    frequencyLabel,
    invoiceShareText,
    type BillingInvoice,
  } from "$lib/billing/index.js";
  import {
    downloadInvoicePdf,
    invoicePdfBytes,
  } from "$lib/billing/invoice-pdf.js";
  import ShareLinkButton from "$lib/components/admin/share/ShareLinkButton.svelte";

  let {
    isOpen = $bindable(false),
    invoice = null as BillingInvoice | null,
    onClose = () => {},
    onChanged = () => {},
  } = $props();

  const plan = $derived(invoice?.pricing_plan_frequency_price);
  const company = $derived(invoice?.company);
  const shareMessage = $derived(invoice ? invoiceShareText(invoice) : "BamanStock invoice");

  let downloading = $state(false);
  let downloadError = $state<string | null>(null);

  function handlePrint() {
    if (typeof window === "undefined") return;
    window.print();
    onChanged();
  }

  async function handleDownload() {
    if (!invoice || downloading) return;
    downloading = true;
    downloadError = null;
    try {
      await downloadInvoicePdf(invoice);
    } catch (e) {
      downloadError = e instanceof Error ? e.message : "The PDF could not be generated.";
    } finally {
      downloading = false;
    }
  }

  function handleClose() {
    isOpen = false;
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === "Escape") handleClose();
  }
</script>

{#if isOpen && invoice}
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 invoice-print-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    role="dialog"
    aria-modal="true"
    aria-labelledby="invoice-preview-title"
    tabindex="-1"
  >
    <div
      class="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto invoice-print-sheet"
    >
      <!-- Sheet head -->
      <div class="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-[#4D8DEE] flex items-center justify-center shrink-0">
            <Icon iconName="icon/trending-up" size={22} class="text-white" />
          </div>
          <div>
            <p class="text-lg font-extrabold tracking-tight text-gray-900">BAMANSTOCK</p>
            <p class="text-[11px] text-gray-500">Logistics &amp; Supply Platform</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-2xl font-extrabold tracking-widest text-gray-900">INVOICE</p>
          <p class="text-sm font-bold text-gray-700 mt-1">{invoice.invoice_number}</p>
        </div>
      </div>

      <!-- Meta -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Issue date</p>
          <p class="text-sm font-semibold text-gray-900 mt-1">
            {formatDate(invoice.created_at)}
          </p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service period</p>
          <p class="text-sm font-semibold text-gray-900 mt-1">
            {formatDate(invoice.start_date)} — {formatDate(invoice.end_date)}
          </p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
          <p class="text-sm font-semibold text-gray-900 mt-1">Paid</p>
        </div>
      </div>

      <!-- Parties -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 py-5">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Billed to</p>
          <p class="text-sm font-bold text-gray-900 mt-2">{company?.name ?? "—"}</p>
          <p class="text-xs text-gray-600 mt-1">
            TIN: {invoice.tin_number ?? company?.tin_number ?? "—"}
          </p>
          <p class="text-xs text-gray-600">License: {company?.license ?? "—"}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment details</p>
          <p class="text-xs text-gray-600 mt-2">
            Method:
            <span class="font-semibold text-gray-900 capitalize">
              {(invoice.payment?.payment_method ?? "—").replace(/_/g, " ")}
            </span>
          </p>
          <p class="text-xs text-gray-600">
            Transaction:
            <span class="font-semibold text-gray-900">{invoice.transaction_id ?? "—"}</span>
          </p>
          <p class="text-xs text-gray-600">
            Paid on: <span class="font-semibold text-gray-900">{formatDate(invoice.payment?.payment_date)}</span>
          </p>
        </div>
      </div>

      <!-- Line items -->
      <div class="px-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-600">
              <th class="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Description</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-20">Qty</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-32">Unit price</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-200">
              <td class="px-4 py-4">
                <p class="font-semibold text-gray-900">
                  {plan?.pricing_plan?.name ?? "Subscription"} — {frequencyLabel(plan?.frequency)}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {invoice.reason ?? plan?.pricing_plan?.description ?? "Subscription payment"}
                </p>
              </td>
              <td class="px-4 py-4 text-right text-gray-700">1</td>
              <td class="px-4 py-4 text-right text-gray-700">{formatCurrency(plan?.price ?? invoice.subtotal)}</td>
              <td class="px-4 py-4 text-right font-semibold text-gray-900">{formatCurrency(invoice.subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="px-6 py-5 flex justify-end">
        <div class="w-full sm:w-80 flex flex-col gap-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Subtotal</span>
            <span class="font-semibold text-gray-900">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">VAT (15%)</span>
            <span class="font-semibold text-gray-900">{formatCurrency(invoice.vat)}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Withholding (2%)</span>
            <span class="font-semibold text-gray-900">{formatCurrency(invoice.withholding)}</span>
          </div>
          <div class="flex items-center justify-between text-base pt-2 mt-1 border-t border-gray-300">
            <span class="font-bold text-gray-900">Total due</span>
            <span class="font-extrabold text-[#2f6fd0]">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
        <p class="text-xs text-gray-500">
          Thank you for your business. This invoice was generated automatically from an approved payment.
        </p>
      </div>

      <!-- Actions (never printed) -->
      <div class="flex flex-col gap-2 p-5 border-t border-gray-200 no-print">
        {#if downloadError}
          <p class="text-sm text-destructive">{downloadError}</p>
        {/if}
        <div class="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onclick={handleClose}
            class="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Close
          </Button>
          <Button
            variant="outline"
            type="button"
            onclick={handlePrint}
            class="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <Icon iconName="icon/printer" size={16} /> Print
          </Button>
          <ShareLinkButton
            getBytes={() => invoicePdfBytes(invoice)}
            message={shareMessage}
            label="Share link"
            title="Generate a Telegram or WhatsApp share link"
            class="border-gray-300 text-gray-700 hover:bg-gray-100"
          />
          <Button
            type="button"
            onclick={handleDownload}
            disabled={downloading}
            class="min-w-[190px]"
          >
            {#if downloading}
              <Icon iconName="icon/refresh-cw" size={16} class="animate-spin" />
              Preparing PDF…
            {:else}
              <Icon iconName="icon/download" size={16} /> Download PDF
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @media print {
    :global(body *) {
      visibility: hidden !important;
    }

    :global(.invoice-print-sheet),
    :global(.invoice-print-sheet *) {
      visibility: visible !important;
    }

    :global(.invoice-print-backdrop) {
      position: static !important;
      padding: 0 !important;
      background: none !important;
      display: block !important;
    }

    :global(.invoice-print-sheet) {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      max-height: none !important;
      overflow: visible !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    :global(.no-print) {
      display: none !important;
    }

    @page {
      margin: 12mm;
    }
  }
</style>
