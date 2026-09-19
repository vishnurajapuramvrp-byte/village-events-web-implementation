/** Store and compute money as integer paise. Never use floating-point rupees. */

export function parseRupeeInput(value: FormDataEntryValue | string | number | null | undefined): number {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw) throw new Error("Amount is required.");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error("Enter a valid amount with up to 2 decimal places.");
  }
  const [rupees, paise = ""] = raw.split(".");
  return Number(rupees) * 100 + Number((paise + "00").slice(0, 2));
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}
