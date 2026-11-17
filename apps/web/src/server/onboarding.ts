import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "./auth";
import { db } from "./db";
import * as schema from "./db/schema";
import { slugify } from "./slug";

async function userHasProject(userId: string) {
  const [row] = await db
    .select({ id: schema.project.id })
    .from(schema.project)
    .innerJoin(schema.member, eq(schema.member.organizationId, schema.project.organizationId))
    .where(eq(schema.member.userId, userId))
    .limit(1);
  return row !== undefined;
}

export const getOnboardingState = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("Not authenticated");

  return { needsProject: !(await userHasProject(session.user.id)) };
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .validator(
    z.object({
      organizationName: z.string().trim().min(1).max(100),
      projectName: z.string().trim().min(1).max(100).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const needsProject = !(await userHasProject(session.user.id));
    const projectName = needsProject ? data.projectName : undefined;
    if (needsProject && !projectName) throw new Error("Project name is required");

    const [claimed] = await db
      .update(schema.user)
      .set({ onboardingCompleted: true })
      .where(and(eq(schema.user.id, session.user.id), eq(schema.user.onboardingCompleted, false)))
      .returning({ id: schema.user.id });
    if (!claimed) throw new Error("Onboarding already completed");

    try {
      const organization = await auth.api.createOrganization({
        body: { name: data.organizationName, slug: "placeholder" },
        headers,
      });

      if (projectName) {
        await db.insert(schema.project).values({
          organizationId: organization.id,
          name: projectName,
          slug: slugify(projectName) || "project",
        });
      }
    } catch (error) {
      await db
        .update(schema.user)
        .set({ onboardingCompleted: false })
        .where(eq(schema.user.id, session.user.id));
      throw error;
    }

    return { ok: true };
  });
