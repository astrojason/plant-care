import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrepareImageForUpload = vi.fn();
vi.mock("@/lib/media/imageProcessing", () => ({
  prepareImageForUpload: (...args: unknown[]) => mockPrepareImageForUpload(...args),
}));

const mockRef = vi.fn(() => ({ __ref: true }));
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
vi.mock("firebase/storage", () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
}));

const { PhotoUploader } = await import("./PhotoUploader");

function makeFile() {
  return new File(["fake-image-bytes"], "plant.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  mockPrepareImageForUpload.mockReset();
  mockRef.mockClear();
  mockUploadBytes.mockReset();
  mockGetDownloadURL.mockReset();
  mockPrepareImageForUpload.mockResolvedValue(new Blob(["resized"], { type: "image/jpeg" }));
  mockUploadBytes.mockResolvedValue(undefined);
  mockGetDownloadURL.mockResolvedValue("https://storage.example.com/photo.jpg");
});

describe("PhotoUploader", () => {
  it("processes and uploads the selected file, then calls onUploaded with the result", async () => {
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<PhotoUploader pathPrefix="users/u1/plants/temp" onUploaded={onUploaded} />);

    const input = screen.getByLabelText(/photo/i);
    await user.upload(input, makeFile());

    expect(mockPrepareImageForUpload).toHaveBeenCalledWith(expect.any(File));
    expect(mockUploadBytes).toHaveBeenCalled();
    expect(onUploaded).toHaveBeenCalledWith({
      storagePath: expect.stringContaining("users/u1/plants/temp/"),
      downloadUrl: "https://storage.example.com/photo.jpg",
    });
  });

  it("shows an uploading indicator while processing is in flight", async () => {
    let resolveProcessing: (blob: Blob) => void = () => {};
    mockPrepareImageForUpload.mockReturnValue(
      new Promise((resolve) => {
        resolveProcessing = resolve;
      })
    );
    const user = userEvent.setup();
    render(<PhotoUploader pathPrefix="users/u1/plants/temp" onUploaded={vi.fn()} />);

    await user.upload(screen.getByLabelText(/photo/i), makeFile());

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    resolveProcessing(new Blob(["x"]));
  });

  it("shows the full error via ErrorBlock when processing fails", async () => {
    mockPrepareImageForUpload.mockRejectedValue(new Error("Unsupported image format"));
    const user = userEvent.setup();
    render(<PhotoUploader pathPrefix="users/u1/plants/temp" onUploaded={vi.fn()} />);

    await user.upload(screen.getByLabelText(/photo/i), makeFile());

    expect(await screen.findByText("Unsupported image format")).toBeInTheDocument();
  });

  it("shows the full error via ErrorBlock when the upload itself fails", async () => {
    mockUploadBytes.mockRejectedValue(new Error("Storage quota exceeded"));
    const user = userEvent.setup();
    render(<PhotoUploader pathPrefix="users/u1/plants/temp" onUploaded={vi.fn()} />);

    await user.upload(screen.getByLabelText(/photo/i), makeFile());

    expect(await screen.findByText("Storage quota exceeded")).toBeInTheDocument();
  });
});
