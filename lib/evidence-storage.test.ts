import { describe, expect, it } from "vitest";
import { parseEvidenceDataUrl } from "./evidence-storage";

describe("parseEvidenceDataUrl", () => {
  it("accepts supported image data URLs", () => {
    expect(parseEvidenceDataUrl("data:image/png;base64,aGVsbG8=")).toEqual({
      mimeType: "image/png",
      base64Data: "aGVsbG8=",
    });
  });

  it("rejects unsupported image types", () => {
    expect(parseEvidenceDataUrl("data:image/gif;base64,R0lGODlh")).toBeNull();
  });

  it("rejects malformed data URLs", () => {
    expect(parseEvidenceDataUrl("image/png;base64,aGVsbG8=")).toBeNull();
  });
});
