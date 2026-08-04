export const formatMoney = (value: number, currency = "BDT") => {
  const symbol = currency === "BDT" ? "৳" : currency === "USD" ? "$" : "₹";
  return `${symbol}${Number(value || 0).toLocaleString()}`;
};

export const formatDate = (value: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
