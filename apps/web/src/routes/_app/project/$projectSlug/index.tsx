import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/project/$projectSlug/")({
  component: ProjectPage,
});

function ProjectPage() {
  const { projectSlug } = Route.useParams();

  return <h1 className="text-2xl font-semibold">{projectSlug}</h1>;
}
