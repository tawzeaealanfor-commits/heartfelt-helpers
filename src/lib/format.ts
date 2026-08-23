export const nf = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Number(n) || 0);

export function statusLabel(status: string) {
  if (status === "active") return "نشط";
  if (status === "inactive") return "غير نشط";
  if (status === "disabled") return "معطل";
  if (status === "review") return "قيد المراجعة";
  if (status === "suspended") return "موقوف";
  return status;
}
