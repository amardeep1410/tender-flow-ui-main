import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TENDER_SOURCES, TENDER_STATUSES } from "@/lib/tender-constants";
import { formatCurrency } from "@/lib/format";
import { getReportMetrics, type ReportMetricsResult } from "@/services/tenders";
import type { Tender } from "@/types/tender";

export function ReportsPage() {
  const [report, setReport] = useState<ReportMetricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const res = await getReportMetrics({ from, to });
        if (isMounted) {
          if (res.error) {
            toast.error("Failed to load reports", { description: res.error });
          } else {
            setReport(res.report);
          }
        }
      } catch {
        if (isMounted) {
          toast.error("Error", { description: "Could not load report metrics." });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [from, to]);

  function exportCSV() {
    if (!report || report.tenders.length === 0) {
      toast.error("No data to export", {
        description: "There are no tenders matching the current filter criteria.",
      });
      return;
    }

    try {
      const headers = [
        "Tender Number",
        "Title",
        "Source",
        "Category",
        "Organization",
        "Department",
        "Product/Service",
        "Status",
        "Estimated Value",
        "Currency",
        "EMD Amount",
        "Tender Fee",
        "Published Date",
        "Submission Start Date",
        "Submission Deadline",
        "Created At",
      ];

      const rows = report.tenders.map((t: Tender) => [
        `"${(t.tenderNumber || "").replace(/"/g, '""')}"`,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.source || "").replace(/"/g, '""')}"`,
        `"${(t.category || "").replace(/"/g, '""')}"`,
        `"${(t.organization || "").replace(/"/g, '""')}"`,
        `"${(t.department || "").replace(/"/g, '""')}"`,
        `"${(t.productService || "").replace(/"/g, '""')}"`,
        `"${(t.status || "").replace(/"/g, '""')}"`,
        t.estimatedValue ?? 0,
        `"${t.currency || "INR"}"`,
        t.emdAmount ?? 0,
        t.tenderFee ?? 0,
        `"${t.publishedDate || ""}"`,
        `"${t.submissionStartDate || ""}"`,
        `"${t.submissionDeadline || ""}"`,
        `"${t.createdAt || ""}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `tender-report-${new Date().toISOString().slice(0, 10)}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Report exported", { description: filename });
    } catch {
      toast.error("Export failed", { description: "An error occurred while generating CSV." });
    }
  }

  const monthlyCounts = report?.monthlyVolume || [];
  const maxMonthly = Math.max(1, ...monthlyCounts.map((entry) => entry.count));
  const statusSummary = report?.statusSummary || [];
  const sourceSummary = report?.sourceSummary || [];
  const financials = report?.financials || {
    totalEstimatedValue: 0,
    avgEstimatedValue: 0,
    totalEmd: 0,
    avgEmd: 0,
    currency: "INR",
    tenderCount: 0,
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Summaries across status, source, volume and financial value"
        actions={
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={isLoading || !report?.tenders.length}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,220px))_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="report-from">From (Created Date)</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-to">To (Created Date)</Label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button
            variant="ghost"
            disabled={!from && !to}
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear range
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading report metrics...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Status Summary" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {TENDER_STATUSES.map((status) => {
                const count =
                  statusSummary.find((s) => s.status.toLowerCase() === status.label.toLowerCase())
                    ?.count || 0;
                return (
                  <li
                    key={status.value}
                    className="flex items-center justify-between px-5 py-3.5 text-sm"
                  >
                    <span className="font-medium">{status.label}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <SectionCard title="Source Summary" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {TENDER_SOURCES.map((source) => {
                const count = sourceSummary.find((s) => s.source === source)?.count || 0;
                return (
                  <li
                    key={source}
                    className="flex items-center justify-between px-5 py-3.5 text-sm"
                  >
                    <span className="font-medium">{source}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <SectionCard title="Tender Count by Month" description="Monthly creation trend">
            <div className="flex h-44 items-end gap-3">
              {monthlyCounts.map((entry) => (
                <div key={entry.monthKey} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{entry.count}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all duration-300"
                    style={{ height: `${Math.max(4, (entry.count / maxMonthly) * 120)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{entry.month}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Tender Value Summary"
            description="Aggregated pipeline financial metrics"
          >
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                  Total estimated value
                </dt>
                <dd className="mt-1 text-2xl font-bold">
                  {formatCurrency(financials.totalEstimatedValue, financials.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                  Average estimated value
                </dt>
                <dd className="mt-1 text-2xl font-bold">
                  {formatCurrency(financials.avgEstimatedValue, financials.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Total EMD</dt>
                <dd className="mt-1 text-2xl font-bold">
                  {formatCurrency(financials.totalEmd, financials.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                  Tenders in scope
                </dt>
                <dd className="mt-1 text-2xl font-bold">{financials.tenderCount}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      )}
    </>
  );
}
