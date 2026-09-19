import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DetailField, SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
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
import { statusLabel } from "@/lib/tender-constants";
import { formatCurrency, formatDate, formatDateTime, formatFileSize } from "@/lib/format";
import {
  deleteTenderDocument,
  getSignedDocumentUrl,
  getTenderById,
  softDeleteTender,
  uploadTenderDocument,
} from "@/services/tenders";
import { useAuth } from "@/hooks/use-auth";
import type { Tender, TenderDocument } from "@/types/tender";

export function TenderDetailsPage() {
  const { tenderId } = useParams({ from: "/_app/tenders/$tenderId" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      const res = await getTenderById(tenderId);
      if (res.error) {
        toast.error("Failed to load tender", { description: res.error });
      }
      setTender(res.tender);
    } catch {
      toast.error("Error", { description: "Could not load tender details." });
    } finally {
      setIsLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    setIsLoading(true);
    loadDetails();
  }, [loadDetails]);

  async function handleDeleteConfirm() {
    if (!tender || !user) return;
    setIsDeleting(true);
    try {
      const res = await softDeleteTender(tender.id, user.id);
      if (res.success) {
        toast.success("Tender deleted", {
          description: `${tender.tenderNumber} has been removed.`,
        });
        setConfirmDelete(false);
        navigate({ to: "/tenders" });
      } else {
        toast.error("Failed to delete tender", { description: res.error });
      }
    } catch {
      toast.error("Error", { description: "An error occurred during deletion." });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownloadDoc(doc: TenderDocument) {
    if (!doc.filePath) {
      toast.error("File path is unavailable.");
      return;
    }
    setDownloadingDocId(doc.id);
    try {
      const { signedUrl, error } = await getSignedDocumentUrl(doc.filePath);
      if (error || !signedUrl) {
        toast.error("Download failed", { description: error || "Could not retrieve file URL." });
        return;
      }
      // Trigger download
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = doc.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started", { description: doc.name });
    } catch {
      toast.error("Download failed", { description: "An error occurred while downloading." });
    } finally {
      setDownloadingDocId(null);
    }
  }

  async function handleUploadAdditionalDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !user || !tender) return;

    setIsUploadingDoc(true);
    try {
      for (const file of Array.from(fileList)) {
        const { error } = await uploadTenderDocument(tender.id, file, user.id);
        if (error) {
          toast.error(`Failed to upload ${file.name}`, { description: error });
        } else {
          toast.success("Document attached", { description: file.name });
        }
      }
      await loadDetails();
    } catch {
      toast.error("Upload error", { description: "Could not upload document." });
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDoc(doc: TenderDocument) {
    if (!doc || !tender) return;
    setDeletingDocId(doc.id);
    try {
      const { success, error } = await deleteTenderDocument(doc.id, doc.filePath);
      if (success) {
        toast.success("Document removed", { description: doc.name });
        await loadDetails();
      } else {
        toast.error("Failed to delete document", { description: error });
      }
    } catch {
      toast.error("Error", { description: "Could not delete document." });
    } finally {
      setDeletingDocId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading tender details...</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <SectionCard bodyClassName="p-0">
        <EmptyState
          title="Tender not found"
          description="This tender does not exist or has been removed."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/tenders">Back to tenders</Link>
            </Button>
          }
        />
      </SectionCard>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link to="/tenders">
          <ArrowLeft className="size-4" />
          Back to tenders
        </Link>
      </Button>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">{tender.tenderNumber}</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">{tender.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={tender.status} />
            {tender.organization ? <span>{tender.organization}</span> : null}
            {tender.organization ? <span aria-hidden>·</span> : null}
            <span>Deadline {formatDate(tender.submissionDeadline)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/tenders/$tenderId/edit",
                params: { tenderId: tender.id },
              })
            }
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Basic Information">
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailField label="Source" value={tender.source} />
            <DetailField label="Category" value={tender.category || "—"} />
            <DetailField label="Organization / Client" value={tender.organization || "—"} />
            <DetailField label="Department" value={tender.department || "—"} />
            <DetailField label="Product / Service" value={tender.productService || "—"} />
            <DetailField
              label="Portal URL"
              value={
                tender.portalUrl ? (
                  <a
                    href={tender.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open portal listing
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <div className="sm:col-span-2">
              <DetailField label="Description" value={tender.description || "—"} />
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Financial Information">
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailField
              label="Estimated Value"
              value={formatCurrency(tender.estimatedValue, tender.currency)}
            />
            <DetailField label="Currency" value={tender.currency} />
            <DetailField
              label="EMD Amount"
              value={formatCurrency(tender.emdAmount, tender.currency)}
            />
            <DetailField
              label="Tender Fee"
              value={formatCurrency(tender.tenderFee, tender.currency)}
            />
          </dl>
        </SectionCard>

        <SectionCard title="Important Dates">
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailField label="Published" value={formatDate(tender.publishedDate)} />
            <DetailField label="Submission Start" value={formatDate(tender.submissionStartDate)} />
            <DetailField
              label="Submission Deadline"
              value={formatDate(tender.submissionDeadline)}
            />
            <DetailField label="Pre-Bid" value={formatDate(tender.preBidDate)} />
            <DetailField label="Expected Result" value={formatDate(tender.expectedResultDate)} />
            <DetailField
              label="Expected Completion"
              value={formatDate(tender.expectedCompletionDate)}
            />
          </dl>
        </SectionCard>

        <SectionCard
          title="Documents"
          description="Attachments stored securely in Supabase Storage"
          action={
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                id="details-doc-upload"
                disabled={isUploadingDoc}
                onChange={handleUploadAdditionalDoc}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploadingDoc}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingDoc ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Upload
              </Button>
            </div>
          }
          bodyClassName={tender.documents?.length ? "p-0" : "p-0"}
        >
          {!tender.documents || tender.documents.length === 0 ? (
            <EmptyState
              title="No documents attached"
              description="Upload tender notices, specs or quotes to keep records together."
            />
          ) : (
            <ul className="divide-y divide-border">
              {tender.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} · {formatFileSize(doc.size)} · uploaded{" "}
                        {formatDate(doc.uploadedAt)}
                        {doc.uploaderName ? ` by ${doc.uploaderName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${doc.name}`}
                      disabled={downloadingDocId === doc.id}
                      onClick={() => handleDownloadDoc(doc)}
                    >
                      {downloadingDocId === doc.id ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${doc.name}`}
                      disabled={deletingDocId === doc.id}
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteDoc(doc)}
                    >
                      {deletingDocId === doc.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Status History"
          description="Automatic chronological audit trail of pipeline status transitions"
          bodyClassName="p-0"
        >
          {!tender.statusHistory || tender.statusHistory.length === 0 ? (
            <EmptyState
              title="No status transitions"
              description="Status transitions will be recorded automatically when changed."
            />
          ) : (
            <ol className="divide-y divide-border">
              {tender.statusHistory.map((entry) => (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {entry.from ? (
                      <>
                        <span className="text-muted-foreground">{statusLabel(entry.from)}</span>
                        <span aria-hidden className="text-muted-foreground">
                          →
                        </span>
                      </>
                    ) : null}
                    <StatusBadge status={entry.to} />
                    <span className="text-muted-foreground">
                      by {entry.changedByName || "System"}
                    </span>
                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                  </div>
                  {entry.remarks ? (
                    <p className="mt-1 text-xs text-muted-foreground">{entry.remarks}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard
          title="Activity Audit Log"
          description="Immutable record of user and database operations"
          bodyClassName="p-0"
        >
          {!tender.activity || tender.activity.length === 0 ? (
            <EmptyState
              title="No activity recorded"
              description="Actions performed on this tender will appear here automatically."
            />
          ) : (
            <ol className="divide-y divide-border">
              {tender.activity.map((act) => (
                <li key={act.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Clock className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-foreground">{act.description}</p>
                    <p className="text-xs text-muted-foreground">
                      by {act.userName || act.user || "System"} · {formatDateTime(act.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {tender.tenderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This tender will be soft-deleted and removed from active lists. An administrator can
              recover it if needed.
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
