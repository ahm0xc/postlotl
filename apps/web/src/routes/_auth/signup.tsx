import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <FieldDescription>Must be at least 8 characters.</FieldDescription>
        </Field>
        {error && (
          <Alert variant="error" role="alert">
            <AlertTitle>Sign up failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" width="full" loading={pending}>
          Sign up
        </Button>
      </form>
      <p className="text-muted-foreground text-sm">
        Have an account?{" "}
        <Button profile="inline" variant="link" render={<Link to="/login" />}>
          Sign in
        </Button>
      </p>
    </main>
  );
}
