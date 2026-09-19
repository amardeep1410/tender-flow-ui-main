import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/StateBlocks";
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
import {
  CURRENCIES,
  TENDER_CATEGORIES,
  TENDER_SOURCES,
  TENDER_STATUSES,
} from "@/lib/tender-constants";
import { getTenderById, updateTender, type TenderFormData } from "@/services/tenders";
import { useAuth } from "@/hooks/use-auth";

interface FormState extends TenderFormData {
  status: string;
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

export function EditTenderPage() {
  const { tenderId } = useParams({ from: "/_app/tenders/$tenderId/edit" });
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const res = await getTenderById(tenderId);
        if (isMounted) {
          if (res.error) {
            toast.error("Failed to load tender", { description: res.error });
          } else if (res.tender) {
            const t = res.tender;
            setForm({
              tenderNumber: t.tenderNumber || "",
              title: t.title || "",
              source: t.source || "Other",
              category: t.category || "",
              organization: t.organization || "",
              department: t.department || "",
              productService: t.productService || "",
              portalUrl: t.portalUrl || "",
              description: t.description || "",
              estimatedValue: t.estimatedValue ? String(t.estimatedValue) : "",
              currency: t.currency || "INR",
              emdAmount: t.emdAmount ? String(t.emdAmount) : "",
              tenderFee: t.tenderFee ? String(t.tenderFee) : "",
              publishedDate: t.publishedDate || "",
              submissionStartDate: t.submissionStartDate || "",
              submissionDeadline: t.submissionDeadline || "",
              preBidDate: t.preBidDate || "",
              expectedResultDate: t.expectedResultDate || "",
              expectedCompletionDate: t.expectedCompletionDate || "",
              status: t.status || "Draft",
            });
          }
        }
      } catch {
        if (isMounted) {
          toast.error("Error", { description: "Could not load tender for editing." });
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
  }, [tenderId]);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  function validate() {
    if (!form) return false;
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

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (!user) {
      toast.error("Authentication required", {
        description: "Please log in to update tenders.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTender(tenderId, form, user.id);
      if (res.error) {
        toast.error("Failed to update tender", { description: res.error });
        return;
      }

      toast.success("Tender updated successfully", {
        description: `Changes to ${form.tenderNumber} have been saved.`,
      });

      navigate({
        to: "/tenders/$tenderId",
        params: { tenderId },
      });
    } catch {
      toast.error("Error", { description: "An unexpected error occurred while saving." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading tender for editing...</p>
        </div>
      </div>
    );
  }

  if (!form) {
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
    <form onSubmit={handleSave} noValidate className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link to="/tenders/$tenderId" params={{ tenderId }}>
          <ArrowLeft className="size-4" />
          Back to tender details
        </Link>
      </Button>

      <PageHeader
        title={`Edit ${form.tenderNumber}`}
        description="Update tender specifications, financials and milestones"
      />

      <SectionCard title="Basic Information" description="Identification and sourcing details">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenderNumber">Tender Number *</Label>
            <Input
              id="tenderNumber"
              value={form.tenderNumber}
              disabled={isSaving}
              onChange={(e) => update("tenderNumber")(e.target.value)}
              aria-invalid={Boolean(errors.tenderNumber)}
              aria-describedby="tenderNumber-error"
            />
            <FieldError id="tenderNumber-error" message={errors.tenderNumber} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Tender Title *</Label>
            <Input
              id="title"
              value={form.title}
              disabled={isSaving}
              onChange={(e) => update("title")(e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby="title-error"
            />
            <FieldError id="title-error" message={errors.title} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={update("status")} disabled={isSaving}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {TENDER_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source">Source *</Label>
            <Select value={form.source} onValueChange={update("source")} disabled={isSaving}>
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
            <Select value={form.category} onValueChange={update("category")} disabled={isSaving}>
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
              disabled={isSaving}
              onChange={(e) => update("organization")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={form.department}
              disabled={isSaving}
              onChange={(e) => update("department")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="productService">Product / Service</Label>
            <Input
              id="productService"
              value={form.productService}
              disabled={isSaving}
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
              disabled={isSaving}
              onChange={(e) => update("portalUrl")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              disabled={isSaving}
              onChange={(e) => update("description")(e.target.value)}
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
              disabled={isSaving}
              onChange={(e) => update("estimatedValue")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select value={form.currency} onValueChange={update("currency")} disabled={isSaving}>
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
              disabled={isSaving}
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
              disabled={isSaving}
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
                disabled={isSaving}
                onChange={(e) => update(key)(e.target.value)}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={`${key}-error`}
              />
              <FieldError id={`${key}-error`} message={errors[key]} />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" asChild disabled={isSaving}>
          <Link to="/tenders/$tenderId" params={{ tenderId }}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
