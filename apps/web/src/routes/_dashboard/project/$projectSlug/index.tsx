import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/")({
  component: ProjectPage,
});

function ProjectPage() {
  return null;
}
