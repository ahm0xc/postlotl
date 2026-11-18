import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { findProjectAccess, getSession, requireProjectCapability, requireUser } from "./access";
import { db } from "./db";
import * as schema from "./db/schema";
import { generateUniqueProjectSlug } from "./slug";

const slugInput = z.object({ slug: z.string().min(1) });

async function isSlugTaken(candidate: string) {
  const [existing] = await db
    .select({ id: schema.project.id })
    .from(schema.project)
    .where(eq(schema.project.slug, candidate))
    .limit(1);
  return existing !== undefined;
}

export const listMyProjects = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();

  return db
    .select({
      id: schema.project.id,
      name: schema.project.name,
      slug: schema.project.slug,
      role: schema.projectMember.role,
    })
    .from(schema.projectMember)
    .innerJoin(schema.project, eq(schema.project.id, schema.projectMember.projectId))
    .where(and(eq(schema.projectMember.userId, user.id), isNull(schema.project.deletedAt)))
    .orderBy(asc(schema.project.createdAt));
});

export const getProject = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(async ({ data }) => findProjectAccess(data.slug));

export const getLastViewedProjectSlug = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  if (!session) return null;

  const activeProjectId = session.session.activeProjectId;
  if (!activeProjectId) return null;

  const [active] = await db
    .select({ slug: schema.project.slug })
    .from(schema.projectMember)
    .innerJoin(schema.project, eq(schema.project.id, schema.projectMember.projectId))
    .where(
      and(
        eq(schema.projectMember.userId, session.user.id),
        eq(schema.project.id, activeProjectId),
        isNull(schema.project.deletedAt),
      ),
    )
    .limit(1);

  return active?.slug ?? null;
});

export const setActiveProject = createServerFn({ method: "POST" })
  .validator(slugInput)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session) return null;

    const access = await findProjectAccess(data.slug);
    if (!access) return null;

    if (session.session.activeProjectId !== access.project.id) {
      await db
        .update(schema.session)
        .set({ activeProjectId: access.project.id })
        .where(eq(schema.session.id, session.session.id));
    }

    return access;
  });

export const createProject = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().trim().min(1).max(100) }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return createOwnedProject(user.id, data.name);
  });

async function createOwnedProject(userId: string, name: string) {
  const slug = await generateUniqueProjectSlug(name, isSlugTaken);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.project)
      .values({ name, slug })
      .returning({ id: schema.project.id, name: schema.project.name, slug: schema.project.slug });

    await tx.insert(schema.projectMember).values({
      projectId: created.id,
      userId,
      role: "owner",
    });

    return created;
  });
}

export const updateProject = createServerFn({ method: "POST" })
  .validator(slugInput.extend({ name: z.string().trim().min(1).max(100) }))
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "settings");

    const [updated] = await db
      .update(schema.project)
      .set({ name: data.name })
      .where(eq(schema.project.id, access.project.id))
      .returning({ id: schema.project.id, name: schema.project.name, slug: schema.project.slug });

    return updated;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator(slugInput)
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "delete_project");

    await db
      .update(schema.project)
      .set({ deletedAt: new Date() })
      .where(eq(schema.project.id, access.project.id));

    return { ok: true };
  });

export const transferOwnership = createServerFn({ method: "POST" })
  .validator(slugInput.extend({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "transfer_ownership");
    if (data.userId === access.user.id) return { ok: true };

    const [target] = await db
      .select({ id: schema.projectMember.id })
      .from(schema.projectMember)
      .where(
        and(
          eq(schema.projectMember.projectId, access.project.id),
          eq(schema.projectMember.userId, data.userId),
        ),
      )
      .limit(1);
    if (!target) throw new Error("That user is not a member of this project");

    await db.transaction(async (tx) => {
      await tx
        .update(schema.projectMember)
        .set({ role: "admin" })
        .where(
          and(
            eq(schema.projectMember.projectId, access.project.id),
            eq(schema.projectMember.userId, access.user.id),
          ),
        );
      await tx
        .update(schema.projectMember)
        .set({ role: "owner" })
        .where(
          and(
            eq(schema.projectMember.projectId, access.project.id),
            eq(schema.projectMember.userId, data.userId),
          ),
        );
    });

    return { ok: true };
  });
