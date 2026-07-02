import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CareEventButtons } from "./CareEventButtons";

describe("CareEventButtons", () => {
  it("calls onLog with 'watered' when the Water button is clicked", async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CareEventButtons onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(onLog).toHaveBeenCalledWith("watered");
  });

  it("calls onLog with 'fertilized' and 'misted' for the other buttons", async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CareEventButtons onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Fertilize" }));
    await user.click(screen.getByRole("button", { name: "Mist" }));

    expect(onLog).toHaveBeenNthCalledWith(1, "fertilized");
    expect(onLog).toHaveBeenNthCalledWith(2, "misted");
  });

  it("disables all buttons while a log action is pending", async () => {
    let resolveLog: () => void = () => {};
    const onLog = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLog = resolve;
        })
    );
    const user = userEvent.setup();
    render(<CareEventButtons onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(screen.getByRole("button", { name: "Fertilize" })).toBeDisabled();
    resolveLog();
  });

  it("shows the full error via ErrorBlock when logging fails", async () => {
    const onLog = vi.fn().mockRejectedValue(new Error("Firestore write failed"));
    const user = userEvent.setup();
    render(<CareEventButtons onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(await screen.findByText("Firestore write failed")).toBeInTheDocument();
  });
});
