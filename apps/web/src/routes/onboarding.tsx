import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { completeOnboarding } from "~/server/onboarding";
import { getSessionState } from "~/server/session";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const state = await getSessionState();
    if (!state) throw redirect({ to: "/login" });
    if (state.onboardingCompleted) throw redirect({ to: "/" });
  },
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      await completeOnboarding({
        data: { organizationName: String(form.get("organizationName")) },
      });
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Create your organization</h1>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field>
          <FieldLabel>Organization name</FieldLabel>
          <Input name="organizationName" required maxLength={100} />
        </Field>
        {error && (
          <Alert variant="error" role="alert">
            <AlertTitle>Could not continue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" width="full" loading={pending}>
          Continue
        </Button>
      </form>
    </main>
  );
}
