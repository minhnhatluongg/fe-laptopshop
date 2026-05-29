const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const formatVND = (value: number | null | undefined) =>
  vndFormatter.format(value ?? 0);

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (input?: string | Date | null) => {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d);
};

export const formatDateTime = (input?: string | Date | null) => {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? "" : dateTimeFormatter.format(d);
};

export const computeDiscountPrice = (
  price: number,
  discount?: number | null,
) => (discount && discount > 0 ? price * (1 - discount / 100) : price);
