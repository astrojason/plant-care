import { Warning } from "@phosphor-icons/react";
import type { ReadingAlert } from "@/lib/care/readings";

/** Lists meter readings that are outside the plant's target ranges. Renders nothing when there are none. */
export function ReadingAlerts({ alerts }: { alerts: ReadingAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section aria-label="Reading alerts" className="flex flex-col gap-[var(--space-2)]">
      {alerts.map((a) => (
        <div key={a.metric} className="flex items-center gap-[var(--space-2)]" style={{ fontSize: 13 }}>
          <Warning size={16} weight="fill" style={{ color: "var(--color-accent)", flex: "none" }} />
          {a.message}
        </div>
      ))}
    </section>
  );
}
