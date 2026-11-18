import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSessionState } from "~/server/session";

export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async () => {
    const state = await getSessionState();
    if (!state) throw redirect({ to: "/sign-in" });
    return { user: state.user };
  },
  component: Outlet,
});
