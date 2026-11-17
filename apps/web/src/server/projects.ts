import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "./auth";
import { db } from "./db";
import * as schema from "./db/schema";
import { slugify } from "./slug";

async function requireMembership(organizationId: string) {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("Not authenticated");

  const [membership] = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) throw new Error("Not a member of this organization");
}

export const listProjects = createServerFn({ method: "GET" })
  .validator(z.object({ organizationId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireMembership(data.organizationId);

    return db
      .select({ id: schema.project.id, name: schema.project.name, slug: schema.project.slug })
      .from(schema.project)
      .where(eq(schema.project.organizationId, data.organizationId))
      .orderBy(asc(schema.project.createdAt));
  });

export const createProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      organizationId: z.string().min(1),
      name: z.string().trim().min(1).max(100),
    }),
  )
  .handler(async ({ data }) => {
    await requireMembership(data.organizationId);

    const slug = slugify(data.name) || "project";
    const [existing] = await db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(
        and(eq(schema.project.organizationId, data.organizationId), eq(schema.project.slug, slug)),
      )
      .limit(1);
    if (existing) throw new Error("A project with this name already exists");

    const [created] = await db
      .insert(schema.project)
      .values({ organizationId: data.organizationId, name: data.name, slug })
      .returning({ id: schema.project.id, name: schema.project.name, slug: schema.project.slug });
    return created;
  });
