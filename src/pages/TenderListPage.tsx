import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TENDER_CATEGORIES, TENDER_SOURCES, TENDER_STATUSES } from "@/lib/tender-constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getTenders, softDeleteTender } from "@/services/tenders";
import { useAuth } from "@/hooks/use-auth";
import type { Tender } from "@/types/tender";

const PAGE_SIZE = 8;
const ALL = "all";

export function TenderListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Tender | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTenders = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await getTenders({
        search,
        status,
        source,
        category,
        deadlineFrom,
        page,
        pageSize: PAGE_SIZE,
      });

      if (res.error) {
        setIsError(true);
        toast.error("Failed to load tenders", { description: res.error });
      } else {
        setTenders(res.tenders);
        setTotalCount(res.totalCount);
      }
    } catch {
      setIsError(true);
      toast.error("Error", { description: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  }, [search, status, source, category, deadlineFrom, page]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const hasFilters =
    Boolean(search) ||
    status !== ALL ||
    source !== ALL ||
    category !== ALL ||
    Boolean(deadlineFrom);

  function clearFilters() {
    setSearch("");
    setStatus(ALL);
    setSource(ALL);
    setCategory(ALL);
    setDeadlineFrom("");
    setPage(1);
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete || !user) return;
    setIsDeleting(true);
    try {
      const res = await softDeleteTender(pendingDelete.id, user.id);
      if (res.success) {
        toast.success("Tender deleted", {
          description: `${pendingDelete.tenderNumber} has been removed.`,
        });
        setPendingDelete(null);
        loadTenders();
      } else {
        toast.error("Failed to delete tender", { description: res.error });
      }
    } catch {
      toast.error("Error", { description: "Could not complete deletion." });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tenders"
        description="All tracked tenders across sources and categories"
        actions={
          <Button asChild>
            <Link to="/tenders/new">
              <Plus className="size-4" />
              Add Tender
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="tender-search">Search</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tender-search"
                placeholder="Tender number, title or client"
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {TENDER_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-source">Source</Label>
            <Select
              value={source}
              onValueChange={(value) => {
                setSource(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="filter-source">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sources</SelectItem>
                {TENDER_SOURCES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="filter-category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {TENDER_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-date">Deadline from</Label>
            <Input
              id="filter-date"
              type="date"
              value={deadlineFrom}
              onChange={(event) => {
                setDeadlineFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            variant="ghost"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="lg:mb-0.5"
          >
            <X className="size-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : isError ? (
          <ErrorState onRetry={loadTenders} />
        ) : tenders.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No tenders match your filters" : "No tenders yet"}
            description={
              hasFilters
                ? "Try widening your search or clearing the filters."
                : "Add your first tender to start tracking deadlines."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/tenders/new">Add Tender</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-semibold">Tender Number</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Estimated Value</th>
                  <th className="px-5 py-3 font-semibold">Deadline</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Last Updated</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenders.map((tender) => (
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
                    <td className="max-w-[280px] truncate px-5 py-3.5">{tender.title}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{tender.source}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{tender.category || "—"}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {formatCurrency(tender.estimatedValue, tender.currency)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {formatDate(tender.submissionDeadline)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tender.status} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(tender.updatedAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          aria-label={`View ${tender.tenderNumber}`}
                        >
                          <Link to="/tenders/$tenderId" params={{ tenderId: tender.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${tender.tenderNumber}`}
                          onClick={() =>
                            navigate({
                              to: "/tenders/$tenderId/edit",
                              params: { tenderId: tender.id },
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${tender.tenderNumber}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(tender)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalCount > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} tenders
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tender?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.tenderNumber} will be removed from active views. This record can be
              restored by an administrator if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDeleteConfirm}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
