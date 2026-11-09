import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestUserId } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reportId: true,
      type: true,
      reportType: true,
      title: true,
      location: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(reports);
}
