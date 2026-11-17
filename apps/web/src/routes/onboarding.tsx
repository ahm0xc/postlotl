import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { getSessionState } from "~/server/session";
import { completeOnboarding } from "~/server/onboarding";

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
      await completeOnboarding({ data: { organizationName: String(form.get("organizationName")) } });
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Create your organization</h1>
      <input name="organizationName" placeholder="Organization name" required maxLength={100} />
      <button type="submit" disabled={pending}>
        Continue
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
