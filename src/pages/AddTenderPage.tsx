import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, TENDER_CATEGORIES, TENDER_SOURCES } from "@/lib/tender-constants";
import { formatFileSize } from "@/lib/format";
import { createTender, uploadTenderDocument } from "@/services/tenders";
import { useAuth } from "@/hooks/use-auth";

interface FormState {
  tenderNumber: string;
  title: string;
  source: string;
  category: string;
  organization: string;
  department: string;
  productService: string;
  portalUrl: string;
  description: string;
  estimatedValue: string;
  currency: string;
  emdAmount: string;
  tenderFee: string;
  publishedDate: string;
  submissionStartDate: string;
  submissionDeadline: string;
  preBidDate: string;
  expectedResultDate: string;
  expectedCompletionDate: string;
}

const initialForm: FormState = {
  tenderNumber: "",
  title: "",
  source: "",
  category: "",
  organization: "",
  department: "",
  productService: "",
  portalUrl: "",
  description: "",
  estimatedValue: "",
  currency: "INR",
  emdAmount: "",
  tenderFee: "",
  publishedDate: "",
  submissionStartDate: "",
  submissionDeadline: "",
  preBidDate: "",
  expectedResultDate: "",
  expectedCompletionDate: "",
};

interface StagedFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
}

type Errors = Partial<Record<keyof FormState, string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

export function AddTenderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function validate() {
    const next: Errors = {};
    if (!form.tenderNumber.trim()) next.tenderNumber = "Tender number is required";
    if (!form.title.trim()) next.title = "Tender title is required";
    if (!form.source) next.source = "Select a source";
    if (!form.submissionDeadline) {
      next.submissionDeadline = "Submission deadline is required";
    } else if (form.submissionStartDate && form.submissionDeadline < form.submissionStartDate) {
      next.submissionDeadline = "Deadline must be on or after the submission start date";
    }

    if (form.preBidDate && form.submissionDeadline && form.preBidDate > form.submissionDeadline) {
      next.preBidDate = "Pre-bid date should not be after submission deadline";
    }

    if (
      form.expectedResultDate &&
      form.submissionDeadline &&
      form.expectedResultDate < form.submissionDeadline
    ) {
      next.expectedResultDate = "Expected result date should not be before submission deadline";
    }

    if (
      form.expectedCompletionDate &&
      form.expectedResultDate &&
      form.expectedCompletionDate < form.expectedResultDate
    ) {
      next.expectedCompletionDate =
        "Expected completion date should not be before expected result date";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const staged: StagedFile[] = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      type: (file.name.split(".").pop() ?? "file").toUpperCase(),
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...staged]);
  }

  async function handleSave(status: "Draft" | "Submitted") {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (!user) {
      toast.error("Authentication required", {
        description: "Please log in to create tenders.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTender({ ...form, status }, user.id);
      if (res.error || !res.tender) {
        toast.error("Failed to create tender", { description: res.error });
        return;
      }

      const tenderId = res.tender.id;

      // Upload staged documents if any
      if (files.length > 0) {
        let uploadSuccessCount = 0;
        let uploadFailedCount = 0;

        for (const item of files) {
          const uploadRes = await uploadTenderDocument(tenderId, item.file, user.id);
          if (uploadRes.error) {
            uploadFailedCount++;
            toast.error(`Upload error: ${item.name}`, { description: uploadRes.error });
          } else {
            uploadSuccessCount++;
          }
        }

        if (uploadSuccessCount > 0) {
          toast.info(
            `${uploadSuccessCount} document${uploadSuccessCount > 1 ? "s" : ""} uploaded.`,
          );
        }
      }

      toast.success(status === "Draft" ? "Tender saved as draft" : "Tender created successfully", {
        description: `Tender ${form.tenderNumber} has been recorded.`,
      });

      navigate({
        to: "/tenders/$tenderId",
        params: { tenderId },
      });
    } catch {
      toast.error("Error", { description: "An unexpected error occurred while saving." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave("Submitted");
      }}
      noValidate
      className="space-y-6"
    >
      <PageHeader title="Add Tender" description="Capture a new tender record" />

      <SectionCard title="Basic Information" description="Identification and sourcing details">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenderNumber">Tender Number *</Label>
            <Input
              id="tenderNumber"
              value={form.tenderNumber}
              disabled={isSubmitting}
              onChange={(e) => update("tenderNumber")(e.target.value)}
              aria-invalid={Boolean(errors.tenderNumber)}
              aria-describedby="tenderNumber-error"
              placeholder="GEM/2026/B/0000000"
            />
            <FieldError id="tenderNumber-error" message={errors.tenderNumber} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Tender Title *</Label>
            <Input
              id="title"
              value={form.title}
              disabled={isSubmitting}
              onChange={(e) => update("title")(e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby="title-error"
              placeholder="Short descriptive title"
            />
            <FieldError id="title-error" message={errors.title} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source">Source *</Label>
            <Select value={form.source} onValueChange={update("source")} disabled={isSubmitting}>
              <SelectTrigger id="source" aria-invalid={Boolean(errors.source)}>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {TENDER_SOURCES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="source-error" message={errors.source} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.category}
              onValueChange={update("category")}
              disabled={isSubmitting}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TENDER_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="organization">Organization / Client</Label>
            <Input
              id="organization"
              value={form.organization}
              disabled={isSubmitting}
              onChange={(e) => update("organization")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={form.department}
              disabled={isSubmitting}
              onChange={(e) => update("department")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="productService">Product / Service</Label>
            <Input
              id="productService"
              value={form.productService}
              disabled={isSubmitting}
              onChange={(e) => update("productService")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portalUrl">Portal URL</Label>
            <Input
              id="portalUrl"
              type="url"
              placeholder="https://"
              value={form.portalUrl}
              disabled={isSubmitting}
              onChange={(e) => update("portalUrl")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              disabled={isSubmitting}
              onChange={(e) => update("description")(e.target.value)}
              placeholder="Scope, key requirements and internal notes"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Financial Information" description="Values, fees and deposits">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="estimatedValue">Estimated Value</Label>
            <Input
              id="estimatedValue"
              type="number"
              min="0"
              value={form.estimatedValue}
              disabled={isSubmitting}
              onChange={(e) => update("estimatedValue")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={form.currency}
              onValueChange={update("currency")}
              disabled={isSubmitting}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emdAmount">EMD Amount</Label>
            <Input
              id="emdAmount"
              type="number"
              min="0"
              value={form.emdAmount}
              disabled={isSubmitting}
              onChange={(e) => update("emdAmount")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenderFee">Tender Fee</Label>
            <Input
              id="tenderFee"
              type="number"
              min="0"
              value={form.tenderFee}
              disabled={isSubmitting}
              onChange={(e) => update("tenderFee")(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Important Dates" description="Milestones for this tender">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              ["publishedDate", "Published Date"],
              ["submissionStartDate", "Submission Start Date"],
              ["submissionDeadline", "Submission Deadline *"],
              ["preBidDate", "Pre-Bid Date"],
              ["expectedResultDate", "Expected Result Date"],
              ["expectedCompletionDate", "Expected Completion Date"],
            ] as [keyof FormState, string][]
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="date"
                value={form[key]}
                disabled={isSubmitting}
                onChange={(e) => update(key)(e.target.value)}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={`${key}-error`}
              />
              <FieldError id={`${key}-error`} message={errors[key]} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Documents"
        description="Tender notice, specifications and proofs (Stored securely in Supabase Storage)"
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-primary bg-accent" : "border-border bg-muted/40"
          }`}
        >
          <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
            <UploadCloud className="size-5" />
          </span>
          <p className="text-sm font-semibold">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, XLSX or images up to 25 MB each
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            aria-label="Upload tender documents"
            onChange={(event) => addFiles(event.target.files)}
          />
        </div>

        {files.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {files.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.name}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" asChild disabled={isSubmitting}>
          <Link to="/tenders">Cancel</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => handleSave("Draft")}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Save as Draft"}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Tender"
          )}
        </Button>
      </div>
    </form>
  );
}
