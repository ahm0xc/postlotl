import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSessionState } from "~/server/session";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const state = await getSessionState();
    if (state) throw redirect({ to: "/" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
