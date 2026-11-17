import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSessionState } from "~/server/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const state = await getSessionState();
    if (!state) throw redirect({ to: "/login" });
    if (!state.onboardingCompleted) throw redirect({ to: "/onboarding" });
    return { user: state.user };
  },
  component: Outlet,
});
