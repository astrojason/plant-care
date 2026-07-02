import type { CareStatus } from "@/lib/types/plant";

const LABELS: Record<CareStatus, string> = {
  ok: "OK",
  overdue: "Overdue",
  "not-tracked": "Not tracked",
};

const STYLES: Record<CareStatus, string> = {
  ok: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  "not-tracked": "bg-gray-100 text-gray-600",
};

export function CareStatusBadge({ status, label }: { status: CareStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {label}: {LABELS[status]}
    </span>
  );
}
