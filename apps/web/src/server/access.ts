import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, isNull } from "drizzle-orm";

import { can, type Capability, type ProjectRole } from "../lib/permissions";
import { auth } from "./auth";
import { db } from "./db";
import * as schema from "./db/schema";

export async function getSession() {
  return auth.api.getSession({ headers: getRequestHeaders() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

export type ProjectAccess = {
  user: { id: string; name: string; email: string };
  project: { id: string; name: string; slug: string };
  role: ProjectRole;
};

export async function findProjectAccess(slug: string): Promise<ProjectAccess | null> {
  const user = await requireUser();

  const [row] = await db
    .select({
      projectId: schema.project.id,
      projectName: schema.project.name,
      projectSlug: schema.project.slug,
      role: schema.projectMember.role,
    })
    .from(schema.project)
    .innerJoin(
      schema.projectMember,
      and(
        eq(schema.projectMember.projectId, schema.project.id),
        eq(schema.projectMember.userId, user.id),
      ),
    )
    .where(and(eq(schema.project.slug, slug), isNull(schema.project.deletedAt)))
    .limit(1);

  if (!row) return null;

  return {
    user: { id: user.id, name: user.name, email: user.email },
    project: { id: row.projectId, name: row.projectName, slug: row.projectSlug },
    role: row.role,
  };
}

export async function requireProjectAccess(slug: string) {
  const access = await findProjectAccess(slug);
  if (!access) throw new Error("Project not found");
  return access;
}

export async function requireProjectCapability(slug: string, capability: Capability) {
  const access = await requireProjectAccess(slug);
  if (!can(access.role, capability)) throw new Error("You do not have permission to do that");
  return access;
}
