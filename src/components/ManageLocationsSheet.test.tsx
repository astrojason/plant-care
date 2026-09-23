import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManageLocationsSheet } from "./ManageLocationsSheet";

function setup() {
  const props = {
    locations: ["Kitchen", "Office"],
    onAdd: vi.fn().mockResolvedValue(undefined),
    onRename: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };
  render(<ManageLocationsSheet {...props} />);
  return props;
}

describe("ManageLocationsSheet", () => {
  it("adds a location", async () => {
    const props = setup();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("New location"), "Porch");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(props.onAdd).toHaveBeenCalledWith("Porch");
  });

  it("renames a location", async () => {
    const props = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Rename Kitchen" }));
    const input = screen.getByLabelText("Rename Kitchen");
    await user.clear(input);
    await user.type(input, "Galley");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(props.onRename).toHaveBeenCalledWith("Kitchen", "Galley");
  });

  it("removes a location", async () => {
    const props = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove Office" }));
    expect(props.onRemove).toHaveBeenCalledWith("Office");
  });
});
