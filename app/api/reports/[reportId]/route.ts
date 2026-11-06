import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "MODERATOR"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();
    if (!Object.values(ReportStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid report status" }, { status: 400 });
    }
    const report = await prisma.report.updateMany({
      where: {
        reportId: {
          in: [params.reportId.trim(), params.reportId.trim().toUpperCase()],
        },
      },
      data: { status },
    });

    if (report.count === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      reportId: params.reportId.trim().toUpperCase(),
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
