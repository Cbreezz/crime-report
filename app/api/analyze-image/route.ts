import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { consumeRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    if (!consumeRateLimit(`analysis:${clientIp}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many image analyses. Please try again later." },
        { status: 429 }
      );
    }
    let payload: { image?: unknown };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON request body is required" },
        { status: 400 }
      );
    }

    const { image } = payload;
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "A valid image is required" },
        { status: 400 }
      );
    }

    const [header, ...dataParts] = image.split(",");
    const mimeType = header.match(/^data:(image\/[^;]+);/)?.[1];
    const base64Data = dataParts.join(",");

    if (!mimeType || !base64Data) {
      return NextResponse.json(
        { error: "A valid image is required" },
        { status: 400 }
      );
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are supported" },
        { status: 400 }
      );
    }
    if (base64Data.length > 7_000_000) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini is not configured" },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `Analyze this emergency situation image and respond in this exact format without any asterisks or bullet points:
TITLE: Write a clear, brief title
TYPE: Choose one (Theft, Fire Outbreak, Medical Emergency, Natural Disaster, Violence, or Other)
DESCRIPTION: Write a clear, concise description`;

    const generateContent = () =>
      genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
            ],
          },
        ],
        config: {
          abortSignal: AbortSignal.timeout(12_000),
        },
      });

    let result;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await generateContent();
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isUnavailable =
          /503|UNAVAILABLE|high demand/i.test(message);

        if (!isUnavailable || attempt === 2) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    if (!result) {
      throw new Error("Gemini did not return an analysis");
    }

    const text = result.text || "";

    // Parse the response more precisely
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const typeMatch = text.match(/TYPE:\s*(.+)/);
    const descMatch = text.match(/DESCRIPTION:\s*(.+)/);

    return NextResponse.json({
      title: titleMatch?.[1]?.trim() || "",
      reportType: typeMatch?.[1]?.trim() || "",
      description: descMatch?.[1]?.trim() || "",
    });
  } catch (error) {
    console.error("Image analysis error:", error);
    const message = error instanceof Error ? error.message : "";
    if (/abort|timeout|timed out/i.test(message)) {
      return NextResponse.json(
        { error: "Image analysis timed out" },
        { status: 504 }
      );
    }
    if (/503|UNAVAILABLE|high demand/i.test(message)) {
      return NextResponse.json(
        { error: "Image analysis service is temporarily unavailable" },
        { status: 503 }
      );
    }
    if (/API key|API_KEY_INVALID|permission|unauthenticated/i.test(message)) {
      return NextResponse.json(
        { error: "Image analysis authentication failed" },
        { status: 502 }
      );
    }
    if (/quota|rate limit|resource exhausted/i.test(message)) {
      return NextResponse.json(
        { error: "Image analysis quota exceeded" },
        { status: 429 }
      );
    }
    if (/model|not found|not supported/i.test(message)) {
      return NextResponse.json(
        { error: "Configured image analysis model is unavailable" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
