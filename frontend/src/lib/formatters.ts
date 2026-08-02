export const formatMoney = (value: number, currency = "BDT") => {
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: normalizedCurrency, maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `${normalizedCurrency} ${Number(value || 0).toLocaleString("en-US")}`;
  }
};

export const formatDate = (value: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
