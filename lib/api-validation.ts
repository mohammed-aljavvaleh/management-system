export const APPOINTMENT_STATUSES = ["SCHEDULED", "CANCELLED", "COMPLETED"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && APPOINTMENT_STATUSES.includes(value as AppointmentStatus);
}

export function parseRequiredDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseMoney(value: unknown, max = 1_000_000) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > max) return null;
  return amount;
}

export function parsePositiveMoney(value: unknown, max = 1_000_000) {
  const amount = parseMoney(value, max);
  return amount !== null && amount > 0 ? amount : null;
}

export function parsePositiveInt(value: unknown, max: number) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0 || amount > max) return null;
  return amount;
}
