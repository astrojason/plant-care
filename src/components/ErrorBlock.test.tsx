import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBlock } from "./ErrorBlock";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBlock", () => {
  it("renders the full error message verbatim", () => {
    render(<ErrorBlock error={new Error("OpenAI request failed: 502 Bad Gateway")} />);

    expect(
      screen.getByText("OpenAI request failed: 502 Bad Gateway")
    ).toBeInTheDocument();
  });

  it("renders a string error as-is", () => {
    render(<ErrorBlock error="raw string failure detail" />);

    expect(screen.getByText("raw string failure detail")).toBeInTheDocument();
  });

  it("renders a default title, or a custom one when provided", () => {
    const { rerender } = render(<ErrorBlock error="boom" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    rerender(<ErrorBlock error="boom" title="Upload failed" />);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("exposes the stack trace inside a collapsible details section when present", () => {
    const error = new Error("boom");
    error.stack = "Error: boom\n    at fakeFn (file.ts:1:1)";
    render(<ErrorBlock error={error} />);

    expect(screen.getByText("Stack trace")).toBeInTheDocument();
    expect(screen.getByText(/at fakeFn/)).toBeInTheDocument();
  });

  it("copies the full error text to the clipboard when the copy button is clicked", async () => {
    // userEvent.setup() installs its own navigator.clipboard stub, so the
    // spy must be attached after setup rather than replacing clipboard first.
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<ErrorBlock error={new Error("copy me")} />);

    await user.click(screen.getByRole("button", { name: /copy error/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("copy me"));
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });

  it("has role=alert so it's announced to assistive tech", () => {
    render(<ErrorBlock error="boom" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
