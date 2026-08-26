"use client";

import { Minus, Plus } from "@phosphor-icons/react";

/** A number-or-off stepper. `null` is a legitimate value ("Off"). */
export function Stepper({
  value,
  onChange,
  min = 1,
  step = 1,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  step?: number;
  label: string;
}) {
  function decrement() {
    if (value === null) return;
    const next = value - step;
    onChange(next < min ? null : next);
  }
  function increment() {
    onChange(value === null ? min : value + step);
  }

  return (
    <div className="flex items-center gap-[var(--space-2)]">
      <button
        type="button"
        className="btn btn-icon btn-secondary"
        style={{ width: 30, height: 30 }}
        onClick={decrement}
        aria-label={`Decrease ${label}`}
      >
        <Minus size={14} />
      </button>
      <span style={{ width: 56, textAlign: "center", fontSize: 15, fontWeight: 500 }}>
        {value === null ? "Off" : value}
      </span>
      <button
        type="button"
        className="btn btn-icon btn-secondary"
        style={{ width: 30, height: 30 }}
        onClick={increment}
        aria-label={`Increase ${label}`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
