import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { consumeRateLimit } from "@/lib/rate-limit";

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
    const { image } = await request.json();
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    });

    const prompt = `Analyze this emergency situation image and respond in this exact format without any asterisks or bullet points:
TITLE: Write a clear, brief title
TYPE: Choose one (Theft, Fire Outbreak, Medical Emergency, Natural Disaster, Violence, or Other)
DESCRIPTION: Write a clear, concise description`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const text = await result.response.text(); // Ensure text() is awaited

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
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
