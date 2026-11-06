import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ReportType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import { consumeRateLimit } from "@/lib/rate-limit";
import { storeEvidence } from "@/lib/evidence-storage";

const REPORT_TYPES = [
  "Theft",
  "Fire Outbreak",
  "Medical Emergency",
  "Natural Disaster",
  "Violence",
  "Other",
] as const;

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function createReportId() {
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    if (!consumeRateLimit(`report:${clientIp}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many reports submitted. Please try again later." },
        { status: 429 }
      );
    }

    const {
      type,
      specificType,
      title,
      description,
      location,
      latitude,
      longitude,
      image,
      anonymous,
      reporterName,
    } = await request.json();

    if (type !== "EMERGENCY" && type !== "NON_EMERGENCY") {
      return NextResponse.json(
        { error: "Select a valid incident urgency" },
        { status: 400 }
      );
    }
    if (!REPORT_TYPES.includes(specificType)) {
      return NextResponse.json(
        { error: "Select a valid incident type" },
        { status: 400 }
      );
    }
    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 120
    ) {
      return NextResponse.json(
        { error: "Title must be between 3 and 120 characters" },
        { status: 400 }
      );
    }
    if (
      typeof description !== "string" ||
      description.trim().length < 10 ||
      description.trim().length > 5000
    ) {
      return NextResponse.json(
        { error: "Description must be between 10 and 5000 characters" },
        { status: 400 }
      );
    }
    if (!isNullableString(location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    if (
      typeof image !== "undefined" &&
      typeof image !== "string" &&
      image !== null
    ) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
    if (typeof image === "string" && image.length > 7_000_000) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }
    if (
      typeof image === "string" &&
      image &&
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(image)
    ) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are supported" },
        { status: 400 }
      );
    }

    const numericLatitude =
      typeof latitude === "number" && Number.isFinite(latitude)
        ? latitude
        : null;
    const numericLongitude =
      typeof longitude === "number" && Number.isFinite(longitude)
        ? longitude
        : null;

    if (
      (numericLatitude !== null &&
        (numericLatitude < -90 || numericLatitude > 90)) ||
      (numericLongitude !== null &&
        (numericLongitude < -180 || numericLongitude > 180))
    ) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const numericUserId = session?.user?.id ? parseInt(session.user.id, 10) : null;
    if (!anonymous && !numericUserId) {
      return NextResponse.json(
        { error: "Sign in to submit a report with your identity" },
        { status: 401 }
      );
    }
    let report;
    let reportId: string;

    for (let attempt = 0; attempt < 3; attempt++) {
      reportId = createReportId();
      try {
        const storedImage = await storeEvidence(image || null);
        if (image && !storedImage) {
          return NextResponse.json(
            { error: "Evidence storage is not configured" },
            { status: 503 }
          );
        }
        report = await prisma.report.create({
          data: {
            reportId,
            type: type as ReportType,
            title: title.trim(),
            description: description.trim(),
            reportType: specificType,
            location: location?.trim() || null,
            latitude: numericLatitude,
            longitude: numericLongitude,
            image: storedImage,
            status: "PENDING",
            userId: anonymous ? null : numericUserId,
            reporterName:
              !anonymous && typeof reporterName === "string"
                ? reporterName.trim() || null
                : null,
          },
        });
        break;
      } catch (error: any) {
        if (error?.code !== "P2002" || attempt === 2) {
          throw error;
        }
      }
    }

    if (!report) {
      throw new Error("Unable to generate a unique report ID");
    }

    return NextResponse.json({
      success: true,
      reportId: report.reportId,
      message: "Report submitted successfully",
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit report",
      },
      { status: 500 }
    );
  }
}
