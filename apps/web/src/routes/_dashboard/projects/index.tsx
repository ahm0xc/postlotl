import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectFields, useCreateProjectSubmit } from "@/components/create-project-form";
import { authClient } from "~/lib/auth-client";
import { createProject, listMyProjects } from "~/server/projects";

export const Route = createFileRoute("/_dashboard/projects/")({
  loader: () => listMyProjects(),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [createOpen, setCreateOpen] = useState(false);

  async function openCreatedProject(slug: string) {
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    await navigate({ to: "/project/$projectSlug", params: { projectSlug: slug } });
  }

  async function handleCreateFromPage(name: string) {
    const project = await createProject({ data: { name } });
    await openCreatedProject(project.slug);
  }

  async function handleCreateFromDialog(name: string) {
    const project = await createProject({ data: { name } });
    setCreateOpen(false);
    await openCreatedProject(project.slug);
  }

  async function handleSignOut() {
    await authClient.signOut();
    await navigate({ to: "/sign-in" });
  }

  const createState = useCreateProjectSubmit(handleCreateFromPage);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="grid">
          <h1 className="text-display font-medium">Projects</h1>
          <p className="text-caption text-muted-foreground">{session?.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 ? (
            <Button onClick={() => setCreateOpen(true)}>New project</Button>
          ) : null}
          <Button variant="ghost" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </header>

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create your first project</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={createState.onSubmit}>
              <CreateProjectFields error={createState.error} />
              <Button type="submit" className="w-full" loading={createState.pending}>
                Create project
              </Button>
            </form>
          </CardContent>
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
                    <Badge variant="dot" color="gray">
                      {project.role}
                    </Badge>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateFromDialog}
      />
    </main>
  );
}
