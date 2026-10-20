"use client";

import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "./auth-context";

const ICON_CLASS =
  "text-muted-foreground peer-focus-visible:text-primary pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 transition-colors";

// Login-only sizing: larger, calmer fields than the dense ERP forms. The
// autofill overrides stop the browser painting its blue fill over the card.
const INPUT_CLASS =
  "peer bg-card hover:border-muted-foreground/40 h-12 text-[15px] md:text-[15px] autofill:shadow-[inset_0_0_0_1000px_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)]";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryHint, setShowRecoveryHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a double submit landing before `isLoading` re-renders.
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);

    try {
      const session = await login({ email, password, rememberMe });
      // A first login (or an admin reset) must set a new password first.
      router.push(
        session.user.mustChangePassword
          ? `/change-password?${new URLSearchParams({ from: redirectTo })}`
          : redirectTo,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className={`${INPUT_CLASS} pl-11`}
          />
          <Mail className={ICON_CLASS} aria-hidden />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className={`${INPUT_CLASS} px-11`}
          />
          <Lock className={ICON_CLASS} aria-hidden />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-controls="password"
            aria-pressed={showPassword}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 motion-reduce:transition-none"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 font-normal select-none">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            Remember me
          </label>
          {/* No self-service recovery: passwords are reset by an admin. */}
          <button
            type="button"
            onClick={() => setShowRecoveryHint((value) => !value)}
            aria-expanded={showRecoveryHint}
            aria-controls="recovery-hint"
            className="text-primary focus-visible:ring-ring/50 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
          >
            Forgot password?
          </button>
        </div>
        {showRecoveryHint ? (
          <p
            id="recovery-hint"
            role="status"
            className="bg-accent/60 text-accent-foreground rounded-md px-3 py-2 text-xs leading-relaxed"
          >
            Ask your administrator to reset your password. You&apos;ll set a new
            one the next time you sign in.
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-lg text-[15px] font-semibold tracking-wide shadow-[0_10px_24px_-14px_var(--primary)] transition-[filter,transform,box-shadow] hover:brightness-110 active:translate-y-px motion-reduce:transition-none"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
