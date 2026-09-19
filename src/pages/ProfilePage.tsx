import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DetailField, SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";

export function ProfilePage() {
  const { profile, user, updatePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = profile?.email || user?.email || "";
  const displayRole = profile?.role === "SUPER_ADMIN" ? "Super Admin" : "Tender User";
  const isAccountActive = (profile?.accountStatus ?? "ACTIVE") === "ACTIVE";
  const createdDate = profile?.createdAt || user?.created_at || new Date().toISOString();
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!current) nextErrors.current = "Enter your current password";
    if (next.length < 6) nextErrors.next = "New password must be at least 6 characters";
    if (next !== confirm) nextErrors.confirm = "Passwords do not match";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsUpdating(true);
    try {
      const res = await updatePassword(next);
      if (!res.success) {
        toast.error("Password update failed", {
          description: res.error || "Unable to update password. Please try again.",
        });
        return;
      }

      toast.success("Password updated", {
        description: "Your password has been changed successfully.",
      });
      setOpen(false);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      toast.error("Error", {
        description: "An unexpected error occurred while updating your password.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your account details and security settings" />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Profile Information">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-accent-foreground">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <DetailField label="Name" value={displayName} />
            <DetailField label="Email" value={displayEmail} />
            <DetailField
              label="Role"
              value={
                <span className="inline-flex items-center gap-2">
                  {displayRole}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Read-only
                  </span>
                </span>
              }
            />
            <DetailField
              label="Account Status"
              value={
                <span
                  className={`inline-flex items-center gap-1.5 ${isAccountActive ? "text-success" : "text-destructive"}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${isAccountActive ? "bg-success" : "bg-destructive"}`}
                    aria-hidden
                  />
                  {isAccountActive ? "Active" : "Inactive"}
                </span>
              }
            />
            <DetailField label="Created Date" value={formatDate(createdDate)} />
          </dl>
        </SectionCard>

        <SectionCard title="Security" description="Keep your workspace access protected">
          {open ? (
            <form className="space-y-5" onSubmit={submit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={current}
                  disabled={isUpdating}
                  onChange={(event) => setCurrent(event.target.value)}
                  aria-invalid={Boolean(errors.current)}
                />
                {errors.current ? (
                  <p className="text-xs font-medium text-destructive">{errors.current}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={next}
                  disabled={isUpdating}
                  onChange={(event) => setNext(event.target.value)}
                  aria-invalid={Boolean(errors.next)}
                />
                {errors.next ? (
                  <p className="text-xs font-medium text-destructive">{errors.next}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  disabled={isUpdating}
                  onChange={(event) => setConfirm(event.target.value)}
                  aria-invalid={Boolean(errors.confirm)}
                />
                {errors.confirm ? (
                  <p className="text-xs font-medium text-destructive">{errors.confirm}</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isUpdating}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Manage your Supabase login credentials
                </p>
              </div>
              <Button variant="outline" onClick={() => setOpen(true)}>
                Change password
              </Button>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
