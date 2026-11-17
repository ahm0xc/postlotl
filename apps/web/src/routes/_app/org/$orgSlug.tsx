import { Card, CardHeader, CardPanel, CardTitle } from "@repo/ui/components/card";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { CreateProjectForm } from "~/components/create-project-form";
import { authClient } from "~/lib/auth-client";
import { createProject, getOrganizationProjects } from "~/server/projects";

export const Route = createFileRoute("/_app/org/$orgSlug")({
  loader: async ({ params }) => {
    const page = await getOrganizationProjects({ data: { organizationSlug: params.orgSlug } });
    if (!page) throw notFound();
    return page;
  },
  component: OrganizationPage,
});

function OrganizationPage() {
  const { organization, projects } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const activeOrganizationId = activeOrganization?.id;

  useEffect(() => {
    if (activeOrganizationId === organization.id) return;
    authClient.organization.setActive({ organizationId: organization.id });
  }, [activeOrganizationId, organization.id]);

  async function handleCreateProject(name: string) {
    const project = await createProject({ data: { organizationId: organization.id, name } });
    await navigate({ to: "/project/$projectSlug", params: { projectSlug: project.slug } });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{organization.name}</h1>
      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create your first project</CardTitle>
          </CardHeader>
          <CardPanel>
            <CreateProjectForm onCreate={handleCreateProject} />
          </CardPanel>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                className="block"
                params={{ projectSlug: project.slug }}
                to="/project/$projectSlug"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
