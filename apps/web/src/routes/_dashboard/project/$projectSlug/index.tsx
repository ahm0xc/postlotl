import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/")({
  component: ProjectPage,
});

function ProjectPage() {
  const { projectSlug } = Route.useParams();

  return <h1 className="text-2xl font-semibold">{projectSlug}</h1>;
}
