import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete plant?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title and description when open", () => {
    render(
      <ConfirmDialog
        open
        title="Delete plant?"
        description="This removes all photos and care history for this plant."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete plant?")).toBeInTheDocument();
    expect(
      screen.getByText("This removes all photos and care history for this plant.")
    ).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Proceed?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Proceed?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("supports custom confirm/cancel labels", () => {
    render(
      <ConfirmDialog
        open
        title="Delete this care event?"
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeInTheDocument();
  });

  it("applies destructive styling to the confirm button when destructive is set", () => {
    render(
      <ConfirmDialog
        open
        destructive
        title="Delete plant?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /confirm/i }).className).toMatch(/red/);
  });
});
