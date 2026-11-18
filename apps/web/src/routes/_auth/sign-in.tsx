import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    if (redirectTo) {
      await navigate({ href: redirectTo });
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-title font-medium">Sign in</h1>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input id="login-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {error && (
          <Banner status="error">
            <BannerTitle>Sign in failed</BannerTitle>
            <BannerDescription>{error}</BannerDescription>
          </Banner>
        )}
        <Button type="submit" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>
      <p className="text-caption text-muted-foreground">
        No account?{" "}
        <Button asChild variant="ghost" size="compact" className="h-auto px-0 align-baseline">
          <Link to="/sign-up">Sign up</Link>
        </Button>
      </p>
    </main>
  );
}
