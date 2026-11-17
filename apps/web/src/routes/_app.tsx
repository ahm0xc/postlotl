import {
  DashboardShell,
  DashboardShellHeader,
  DashboardShellInset,
  DashboardShellMain,
  DashboardShellSidebarTrigger,
} from "@repo/ui/components/dashboard-shell";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "~/components/app-sidebar";
import { getSessionState } from "~/server/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const state = await getSessionState();
    if (!state) throw redirect({ to: "/login" });
    if (!state.onboardingCompleted) throw redirect({ to: "/onboarding" });
    return { user: state.user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <DashboardShell>
      <AppSidebar />
      <DashboardShellInset>
        <DashboardShellHeader>
          <DashboardShellSidebarTrigger />
        </DashboardShellHeader>
        <DashboardShellMain>
          <Outlet />
        </DashboardShellMain>
      </DashboardShellInset>
    </DashboardShell>
  );
}
