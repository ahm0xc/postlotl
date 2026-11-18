import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
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
        <main className="p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
