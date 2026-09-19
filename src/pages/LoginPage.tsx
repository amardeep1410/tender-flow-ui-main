import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, isLoading, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Enter a valid email address";
    if (!password) nextErrors.password = "Password is required";
    else if (password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await signIn(email, password, rememberMe);
      if (!result.success) {
        toast.error("Sign in failed", {
          description: result.error || "Invalid email or password.",
        });
        return;
      }

      toast.success("Welcome back!", { description: "Opening your workspace." });
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Unable to sign in", {
        description: "Please check your credentials and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-panel lg:grid-cols-2">
        <div className="order-1 flex flex-col justify-between gap-10 p-8 sm:p-12">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-sm font-bold">Tender Management</span>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your tenders</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email ? (
                  <p id="email-error" className="text-xs font-medium text-destructive">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="min 6 characters"
                    className="pr-10"
                    value={password}
                    disabled={isSubmitting}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" className="text-xs font-medium text-destructive">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Password reset", {
                      description: "Contact your administrator or use the password reset workflow.",
                    })
                  }
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Internal use only · © {new Date().getFullYear()} Tender Management
          </p>
        </div>

        <div className="order-2 hidden gradient-brand p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-center">
          <h2 className="text-3xl leading-tight font-semibold">Tender Management</h2>
          <p className="mt-3 max-w-sm text-sm text-primary-foreground/80">
            Manage tenders, deadlines and submissions from one place.
          </p>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl bg-card/95 p-5 text-card-foreground shadow-elevated">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Active pipeline
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <TrendingUp className="size-3.5" /> +12%
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold">₹6.7 Cr</p>
              <div className="mt-4 flex items-end gap-1.5" aria-hidden>
                {[38, 55, 44, 72, 61, 88, 76, 95].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t bg-primary/25"
                    style={{ height: `${height * 0.6}px` }}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-card/95 p-4 text-card-foreground shadow-elevated">
                <FileCheck2 className="size-4 text-primary" />
                <p className="mt-3 text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground">Submitted this quarter</p>
              </div>
              <div className="rounded-2xl bg-card/95 p-4 text-card-foreground shadow-elevated">
                <CalendarClock className="size-4 text-warning" />
                <p className="mt-3 text-2xl font-bold">5</p>
                <p className="text-xs text-muted-foreground">Deadlines this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
