import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { PageHeader } from "~/components/page-header";
import { setActiveProject } from "~/server/projects";

export const Route = createFileRoute("/_dashboard/project/$projectSlug")({
  beforeLoad: async ({ params }) => {
    const access = await setActiveProject({ data: { slug: params.projectSlug } });
    if (!access) throw notFound();

    return { project: access.project, role: access.role };
  },
  component: ProjectLayout,
});

function ProjectLayout() {
  return (
    <SidebarProvider shortcut={null} persist={false}>
      <AppSidebar />
      <SidebarInset>
        <PageHeader />
        <div className="p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
