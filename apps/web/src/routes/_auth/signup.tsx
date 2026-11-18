import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_auth/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);
    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed");
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-title font-medium">Create account</h1>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field>
          <FieldLabel htmlFor="signup-name">Name</FieldLabel>
          <Input id="signup-name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input id="signup-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <FieldDescription>Must be at least 8 characters.</FieldDescription>
        </Field>
        {error && (
          <Banner status="error">
            <BannerTitle>Sign up failed</BannerTitle>
            <BannerDescription>{error}</BannerDescription>
          </Banner>
        )}
        <Button type="submit" className="w-full" loading={pending}>
          Sign up
        </Button>
      </form>
      <p className="text-caption text-muted-foreground">
        Have an account?{" "}
        <Button asChild variant="ghost" size="compact" className="h-auto px-0 align-baseline">
          <Link to="/login">Sign in</Link>
        </Button>
      </p>
    </main>
  );
}
