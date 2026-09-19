import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, FileStack, Loader, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TENDER_STATUSES } from "@/lib/tender-constants";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import { getTenderStats, type TenderStatsResult } from "@/services/tenders";

const barTone: Record<string, string> = {
  Draft: "bg-muted-foreground/50",
  Submitted: "bg-info",
  "In Progress": "bg-warning",
  Completed: "bg-success",
  Cancelled: "bg-destructive",
};

export function DashboardPage() {
  const [stats, setStats] = useState<TenderStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setIsError(false);
      try {
        const res = await getTenderStats();
        if (isMounted) {
          if (res.error) {
            setIsError(true);
          } else {
            setStats(res.stats);
          }
        }
      } catch {
        if (isMounted) {
          setIsError(true);
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
  }, []);

  const totalCount = stats?.totalCount || 0;
  const submittedCount = stats?.submittedCount || 0;
  const inProgressCount = stats?.inProgressCount || 0;
  const completedCount = stats?.completedCount || 0;
  const upcomingCount = stats?.upcomingCount || 0;

  const statCards = [
    {
      label: "Total Tenders",
      value: totalCount,
      icon: FileStack,
      tone: "text-primary bg-accent",
    },
    {
      label: "Submitted",
      value: submittedCount,
      icon: Send,
      tone: "text-info bg-info/10",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: Loader,
      tone: "text-warning bg-warning/15",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle2,
      tone: "text-success bg-success/12",
    },
    {
      label: "Upcoming Deadlines",
      value: upcomingCount,
      icon: CalendarClock,
      tone: "text-destructive bg-destructive/10",
    },
  ];

  const distribution = stats?.statusDistribution || [];
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  const upcoming = stats?.upcomingTenders || [];
  const recent = stats?.recentTenders || [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your tender activities"
        actions={
          <Button asChild>
            <Link to="/tenders">View all tenders</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-muted-foreground">{stat.label}</p>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${stat.tone}`}>
                <stat.icon className="size-4" />
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-9 w-16" />
            ) : (
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <SectionCard title="Tender Status Overview" description="Distribution across the pipeline">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => window.location.reload()} />
          ) : (
            <ul className="space-y-4">
              {TENDER_STATUSES.map((status) => {
                const count =
                  distribution.find((d) => d.status.toLowerCase() === status.label.toLowerCase())
                    ?.count || 0;
                return (
                  <li key={status.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{status.label}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barTone[status.label] || "bg-primary"}`}
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming Deadlines"
          description="Sorted by nearest submission date"
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming deadlines"
              description="New deadlines appear here automatically when created."
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((tender) => {
                const days = daysUntil(tender.submissionDeadline);
                return (
                  <li key={tender.id} className="px-5 py-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary">{tender.tenderNumber}</p>
                        <p className="mt-0.5 truncate text-sm font-medium">{tender.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(tender.submissionDeadline)} ·{" "}
                          {days === 0 ? "due today" : `${days} days left`}
                        </p>
                      </div>
                      <StatusBadge status={tender.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Tenders"
        description="Most recently updated records"
        bodyClassName="p-0"
      >
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="No tenders recorded yet"
            description="Create your first tender to start tracking records."
            action={
              <Button asChild size="sm">
                <Link to="/tenders/new">Add Tender</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-semibold">Tender Number</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((tender) => (
                  <tr key={tender.id} className="transition-colors hover:bg-muted/60">
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      <Link
                        to="/tenders/$tenderId"
                        params={{ tenderId: tender.id }}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {tender.tenderNumber}
                      </Link>
                    </td>
                    <td className="max-w-[340px] truncate px-5 py-3.5">{tender.title}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{tender.source}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tender.status} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(tender.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
