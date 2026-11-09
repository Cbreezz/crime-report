import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";
import { getRequestUser } from "@/lib/mobile-auth";

export async function GET(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizedId = params.reportId.trim();
    const report = await prisma.report.findFirst({
      where: {
        reportId: {
          in: [normalizedId, normalizedId.toUpperCase()],
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();
    if (!Object.values(ReportStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid report status" }, { status: 400 });
    }

    const normalizedId = params.reportId.trim();
    const report = await prisma.report.findFirst({
      where: {
        reportId: {
          in: [normalizedId, normalizedId.toUpperCase()],
        },
      },
      select: { reportId: true },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await prisma.report.update({
      where: { reportId: report.reportId },
      data: { status },
    });

    return NextResponse.json({
      reportId: report.reportId,
      status,
      updated: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating report" },
      { status: 500 }
    );
  }
}
