/**
 * Shared billing types, labels and formatting helpers.
 *
 * The billing schema lives in the `billing` Postgres schema and is exposed
 * through Hasura as `billing_*` tables. Everything the admin billing page
 * needs to render a pricing plan, a payment or an invoice is derived from the
 * types below.
 */

/** Every frequency seeded into `billing.frequencies`. */
export const FREQUENCY_ORDER = [
  "one_time",
  "monthly",
  "quarterly",
  "biannually",
  "annually",
] as const;

export type Frequency = (typeof FREQUENCY_ORDER)[number];

export const FREQUENCY_LABELS: Record<string, string> = {
  one_time: "One time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannually: "Biannually",
  annually: "Annually",
};

/** Short suffix used on the pricing plan cards. */
export const FREQUENCY_SUFFIXES: Record<string, string> = {
  one_time: "one-off",
  monthly: "/month",
  quarterly: "/quarter",
  biannually: "/6 months",
  annually: "/year",
};

/** Display currency for plan prices and payment amounts. */
export const BILLING_CURRENCY = "ETB";

export type PricingPlan = {
  id: string;
  name: string;
  type: string | null;
  is_public: boolean;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PricingPlanPrice = {
  id: string;
  price: number;
  rules: Record<string, unknown> | null;
  description: string | null;
  frequency: string;
  created_at?: string;
  updated_at?: string;
  pricing_plan: PricingPlan;
};

export type BillingCompany = {
  id: string;
  name: string;
  tin_number: string | number | null;
  license: string | null;
};

export type PaymentStatus = "not_paid" | "payed" | "rejected";

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: "Not paid",
  payed: "Paid",
  rejected: "Rejected",
};

export type BillingPayment = {
  id: string;
  is_verified: boolean | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  transaction_note: string | null;
  reference_id: string | null;
  reference_file: string | null;
  subtotal: number;
  total: number;
  vat: number;
  withholding: number;
  created_at: string;
  company: BillingCompany | null;
  pricing_plan_frequency_price: {
    id: string;
    price: number;
    frequency: string;
    rules: Record<string, unknown> | null;
    pricing_plan: PricingPlan;
  } | null;
  verifier?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export type BillingInvoice = {
  id: string;
  invoice_number: string;
  is_deleted: boolean;
  reason: string | null;
  start_date: string | null;
  end_date: string | null;
  subtotal: number;
  vat: number;
  withholding: number;
  total: number;
  tin_number: string | null;
  transaction_id: string | null;
  created_at: string;
  company: BillingCompany | null;
  payment: {
    id: string;
    payment_method: string | null;
    payment_status: string | null;
    is_verified: boolean | null;
    transaction_id: string | null;
    transaction_note: string | null;
    payment_date: string | null;
    reference_file: string | null;
  } | null;
  pricing_plan_frequency_price: {
    id: string;
    frequency: string;
    price: number;
    rules: Record<string, unknown> | null;
    pricing_plan: PricingPlan;
  } | null;
};

/**
 * Mirrors `billing.calculate_plan_payment()` so the admin can preview an
 * invoice breakdown before the payment is created. The database stays the
 * source of truth — this only mirrors it for display.
 */
export function calculatePlanAmounts(price: number) {
  const subtotal = Number(price) || 0;
  const withholding = subtotal > 5000 ? subtotal * 0.02 : 0;
  const vat = subtotal * 1.15 - subtotal;
  const total = subtotal * 1.15;
  return { subtotal, vat, withholding, total };
}

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${BILLING_CURRENCY} 0.00`;
  return `${BILLING_CURRENCY} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("en-US");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function frequencyLabel(frequency: string | null | undefined): string {
  if (!frequency) return "—";
  return FREQUENCY_LABELS[frequency] ?? frequency.replace(/_/g, " ");
}

export function frequencySuffix(frequency: string | null | undefined): string {
  if (!frequency) return "";
  return FREQUENCY_SUFFIXES[frequency] ?? "";
}

export function planTypeLabel(type: string | null | undefined): string {
  if (!type) return "Plan";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return PAYMENT_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Human label for the `jsonb` rules blob attached to a plan frequency price. */
export function rulesToEntries(
  rules: Record<string, unknown> | null | undefined
): { label: string; value: string }[] {
  if (!rules || typeof rules !== "object") return [];
  return Object.entries(rules).map(([key, value]) => ({
    label: key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" "),
    value:
      typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : Array.isArray(value)
          ? value.join(", ")
          : String(value ?? "—"),
  }));
}

/** Tailwind classes for a payment status pill. */
export function paymentStatusClasses(status: string | null | undefined): string {
  switch (status) {
    case "payed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "rejected":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "not_paid":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * A payment can only be removed while it has never been approved: approving it
 * creates a subscription and an invoice, both of which reference the payment
 * with `ON DELETE RESTRICT`.
 */
export function canDeletePayment(payment: BillingPayment): boolean {
  return payment.payment_status === "not_paid";
}

/**
 * Postgres foreign key violations surface as a raw Hasura error. Translate the
 * common ones into something an admin can act on.
 */
export function billingErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("violates RESTRICT setting of foreign key constraint")) {
    return "This record is already used by a payment or invoice and cannot be deleted.";
  }
  if (message.includes("violates foreign key constraint")) {
    return "This record is still referenced by other data and cannot be deleted.";
  }
  return message || fallback;
}
