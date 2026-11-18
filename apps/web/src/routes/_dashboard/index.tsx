import { createFileRoute, redirect } from "@tanstack/react-router";

import { getLastViewedProjectSlug } from "~/server/projects";

export const Route = createFileRoute("/_dashboard/")({
  loader: async () => {
    const projectSlug = await getLastViewedProjectSlug();
    if (projectSlug) throw redirect({ to: "/project/$projectSlug", params: { projectSlug } });
    throw redirect({ to: "/projects" });
  },
  component: () => null,
});
