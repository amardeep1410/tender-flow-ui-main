import type { TenderSource, TenderStatus } from "@/types/tender";

export const TENDER_STATUSES: { value: TenderStatus; label: string }[] = [
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

export const TENDER_SOURCES: TenderSource[] = ["GeM", "UNGM", "Other"];

export const TENDER_CATEGORIES = ["Goods", "Services", "Works", "Consultancy", "IT & Software"];

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

export function statusLabel(status: string | TenderStatus): string {
  if (!status) return "Draft";
  const s = String(status).toLowerCase().replace(/_/g, " ");
  if (s === "draft") return "Draft";
  if (s === "submitted") return "Submitted";
  if (s === "in progress") return "In Progress";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return status;
}

export function normalizeStatusKey(
  status: string | TenderStatus,
): "draft" | "submitted" | "in_progress" | "completed" | "cancelled" {
  if (!status) return "draft";
  const s = String(status).toLowerCase().replace(/\s+/g, "_");
  if (s === "draft") return "draft";
  if (s === "submitted") return "submitted";
  if (s === "in_progress") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "cancelled") return "cancelled";
  return "draft";
}
