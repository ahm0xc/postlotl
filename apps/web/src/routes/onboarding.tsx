import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { completeOnboarding, getOnboardingState } from "~/server/onboarding";
import { getSessionState } from "~/server/session";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const state = await getSessionState();
    if (!state) throw redirect({ to: "/login" });
    if (state.onboardingCompleted) throw redirect({ to: "/" });
    const { needsProject } = await getOnboardingState();
    return { needsProject };
  },
  component: Onboarding,
});

function Onboarding() {
  const { needsProject } = Route.useRouteContext();
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
        data: {
          organizationName: String(form.get("organizationName")),
          projectName: needsProject ? String(form.get("projectName")) : undefined,
        },
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
      <h1 className="text-title font-medium">Create your organization</h1>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field>
          <FieldLabel htmlFor="organization-name">Organization name</FieldLabel>
          <Input id="organization-name" name="organizationName" required maxLength={100} />
        </Field>
        {needsProject && (
          <Field>
            <FieldLabel htmlFor="project-name">Project name</FieldLabel>
            <Input id="project-name" name="projectName" required maxLength={100} />
          </Field>
        )}
        {error && (
          <Banner status="error">
            <BannerTitle>Could not continue</BannerTitle>
            <BannerDescription>{error}</BannerDescription>
          </Banner>
        )}
        <Button type="submit" className="w-full" loading={pending}>
          Continue
        </Button>
      </form>
    </main>
  );
}
