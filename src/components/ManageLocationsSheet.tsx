"use client";

import { useState } from "react";
import { PencilSimple, Trash, Check, X } from "@phosphor-icons/react";
import { ErrorBlock } from "./ErrorBlock";

export function ManageLocationsSheet({
  locations,
  onAdd,
  onRename,
  onRemove,
  onClose,
}: {
  locations: string[];
  onAdd: (name: string) => Promise<void>;
  onRename: (from: string, to: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<unknown>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    }
  }

  async function add() {
    const name = newName.trim();
    if (!name || locations.includes(name)) return;
    await run(async () => {
      await onAdd(name);
      setNewName("");
    });
  }

  async function commitRename(from: string) {
    const to = editValue.trim();
    setEditing(null);
    if (!to || to === from || locations.includes(to)) return;
    await run(() => onRename(from, to));
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage locations"
        className="dialog"
        style={{ width: "min(420px, 100%)", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Manage locations</h2>
        <div className="flex flex-col">
          {locations.map((loc) => (
            <div key={loc} className="flex items-center gap-[var(--space-2)] row-rule" style={{ padding: "8px 0" }}>
              {editing === loc ? (
                <>
                  <input
                    aria-label={`Rename ${loc}`}
                    className="input flex-1"
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitRename(loc)}
                  />
                  <button type="button" aria-label="Save name" className="btn btn-icon btn-secondary" onClick={() => commitRename(loc)}>
                    <Check size={16} />
                  </button>
                  <button type="button" aria-label="Cancel rename" className="btn btn-icon btn-secondary" onClick={() => setEditing(null)}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{loc}</span>
                  <button
                    type="button"
                    aria-label={`Rename ${loc}`}
                    className="btn btn-icon btn-secondary"
                    onClick={() => {
                      setEditing(loc);
                      setEditValue(loc);
                    }}
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${loc}`}
                    className="btn btn-icon btn-secondary"
                    onClick={() => run(() => onRemove(loc))}
                  >
                    <Trash size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-[var(--space-2)]">
          <input
            aria-label="New location"
            className="input flex-1"
            placeholder="Add a location"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button type="button" className="btn btn-primary" onClick={add} disabled={!newName.trim()}>
            Add
          </button>
        </div>
        <p className="text-tertiary" style={{ fontSize: 11, margin: 0 }}>
          Renaming updates every plant in that location. Removing a location only takes it off this list; plants
          already there keep it.
        </p>
        {error !== null && <ErrorBlock error={error} title="Failed to update locations" />}
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
