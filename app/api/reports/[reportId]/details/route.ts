import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const normalizedReportId = params.reportId.trim().toUpperCase();
    const report = await prisma.report.findFirst({
      where: {
        reportId: {
          in: [params.reportId.trim(), normalizedReportId],
        },
      },
      select: {
        reportId: true,
        type: true,
        title: true,
        description: true,
        location: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching report details:", error);
    return NextResponse.json(
      { error: "Failed to fetch report details" },
      { status: 500 }
    );
  }
}
