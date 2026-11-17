import {
  DashboardShell,
  DashboardShellHeader,
  DashboardShellInset,
  DashboardShellMain,
  DashboardShellSidebarTrigger,
} from "@repo/ui/components/dashboard-shell";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppSidebar } from "~/components/app-sidebar";

export const Route = createFileRoute("/_app/project/$projectSlug")({
  component: ProjectLayout,
});

function ProjectLayout() {
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
