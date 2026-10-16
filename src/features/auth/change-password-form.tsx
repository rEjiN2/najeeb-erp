"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "./auth-context";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./constants";

export function ChangePasswordForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!currentPassword) {
      setError("Enter the password you signed in with.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(
        `The new password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }

    setPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't change your password.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={pending}
          autoFocus
          required
        />
        <p className="text-muted-foreground text-xs">
          The temporary password you were given.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={pending}
          required
        />
        <p className="text-muted-foreground text-xs">
          At least {PASSWORD_MIN_LENGTH} characters.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={pending}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Saving..." : "Change password"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={pending}
        onClick={() => void logout()}
      >
        Sign out instead
      </Button>
    </form>
  );
}
