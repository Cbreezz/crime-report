"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MyReport = {
  id: string;
  reportId: string;
  type: string;
  reportType: string;
  title: string;
  location: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const statusStyles: Record<string, string> = {
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  IN_PROGRESS: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  RESOLVED: "text-green-400 bg-green-500/10 border-green-500/20",
  DISMISSED: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

export default function MyReportsPage() {
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch("/api/reports/mine");
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to load your reports");
        }
        setReports(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your reports");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Reports</h1>
        <p className="mt-2 text-zinc-400">
          Track named reports linked to your account.
        </p>
      </div>

      {loading && <p className="text-zinc-400">Loading your reports...</p>}
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">You have not submitted a named report yet.</p>
          <Link href="/submit-report" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
            Submit a report
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {reports.map((report) => (
          <article key={report.id} className="rounded-xl border border-white/5 bg-zinc-900/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{report.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {report.reportType} · {report.location || "Location not provided"}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[report.status] || statusStyles.DISMISSED}`}>
                {report.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
              <span>Submitted {new Date(report.createdAt).toLocaleDateString()}</span>
              <Link href={`/track-report?reportId=${encodeURIComponent(report.reportId)}`} className="text-sky-400 hover:text-sky-300">
                View tracking
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
