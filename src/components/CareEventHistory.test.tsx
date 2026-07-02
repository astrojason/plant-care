import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CareEvent } from "@/lib/types/plant";
import { CareEventHistory } from "./CareEventHistory";

function makeEvent(overrides: Partial<CareEvent> = {}): CareEvent {
  return {
    id: "event-1",
    eventType: "watered",
    notes: null,
    occurredAt: new Date("2026-06-25T10:00:00Z"),
    ...overrides,
  };
}

describe("CareEventHistory", () => {
  it("shows an empty state when there are no events", () => {
    render(<CareEventHistory events={[]} onDelete={vi.fn()} />);

    expect(screen.getByText(/no care events logged yet/i)).toBeInTheDocument();
  });

  it("renders each event's type", () => {
    render(
      <CareEventHistory
        events={[makeEvent({ id: "e1", eventType: "watered" }), makeEvent({ id: "e2", eventType: "misted" })]}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Watered")).toBeInTheDocument();
    expect(screen.getByText("Misted")).toBeInTheDocument();
  });

  it("does not call onDelete until the confirm dialog is confirmed", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CareEventHistory events={[makeEvent()]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete watered event/i }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onDelete with the event id when the delete is confirmed", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CareEventHistory events={[makeEvent({ id: "event-42" })]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete watered event/i }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("event-42");
  });

  it("does not call onDelete when the confirmation is cancelled", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<CareEventHistory events={[makeEvent()]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete watered event/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the full error via ErrorBlock when deletion fails", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("Firestore delete failed"));
    const user = userEvent.setup();
    render(<CareEventHistory events={[makeEvent()]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete watered event/i }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Firestore delete failed")).toBeInTheDocument();
  });
});
