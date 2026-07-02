import { describe, expect, it } from "vitest";
import { computeScaledDimensions, isHeicFile } from "./imageProcessing";

describe("isHeicFile", () => {
  it("detects HEIC by MIME type", () => {
    expect(isHeicFile({ type: "image/heic", name: "photo.jpg" })).toBe(true);
  });

  it("detects HEIF by MIME type", () => {
    expect(isHeicFile({ type: "image/heif", name: "photo.jpg" })).toBe(true);
  });

  it("detects HEIC by file extension when MIME type is empty (common on iOS Safari)", () => {
    expect(isHeicFile({ type: "", name: "IMG_1234.HEIC" })).toBe(true);
    expect(isHeicFile({ type: "", name: "IMG_1234.heif" })).toBe(true);
  });

  it("returns false for a regular JPEG", () => {
    expect(isHeicFile({ type: "image/jpeg", name: "photo.jpg" })).toBe(false);
  });

  it("returns false for a PNG with no recognizable extension match", () => {
    expect(isHeicFile({ type: "image/png", name: "photo.png" })).toBe(false);
  });
});

describe("computeScaledDimensions", () => {
  it("leaves dimensions unchanged when already under the max", () => {
    expect(computeScaledDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("scales down a landscape image so the longest edge matches the max", () => {
    expect(computeScaledDimensions(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
  });

  it("scales down a portrait image so the longest edge matches the max", () => {
    expect(computeScaledDimensions(1200, 4000, 1600)).toEqual({ width: 480, height: 1600 });
  });

  it("never upscales an image smaller than the max", () => {
    expect(computeScaledDimensions(400, 300, 1600)).toEqual({ width: 400, height: 300 });
  });
});
