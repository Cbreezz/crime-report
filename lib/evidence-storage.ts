import { createHash } from "crypto";

const ALLOWED_IMAGE_TYPES = ["jpeg", "png", "webp"] as const;

export function parseEvidenceDataUrl(image: string): {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  base64Data: string;
} | null {
  const match = image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match || !ALLOWED_IMAGE_TYPES.includes(match[1] as typeof ALLOWED_IMAGE_TYPES[number])) {
    return null;
  }

  return {
    mimeType: `image/${match[1]}` as "image/jpeg" | "image/png" | "image/webp",
    base64Data: match[2],
  };
}

export async function storeEvidence(image: string | null): Promise<string | null> {
  if (!image) return null;

  const evidence = parseEvidenceDataUrl(image);
  if (!evidence) return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return process.env.NODE_ENV === "production" ? null : image;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "safe-report-evidence";
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signaturePayload).digest("hex");
  const body = new FormData();
  body.set("file", image);
  body.set("api_key", apiKey);
  body.set("timestamp", timestamp.toString());
  body.set("folder", folder);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body }
  );

  if (!response.ok) {
    throw new Error("Evidence upload failed");
  }

  const result = await response.json();
  if (typeof result.secure_url !== "string") {
    throw new Error("Evidence upload returned no URL");
  }

  return result.secure_url;
}
