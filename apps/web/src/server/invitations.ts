import { createHash, randomBytes } from "node:crypto";

import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { canAssignRole, invitableRoles } from "../lib/permissions";
import { requireProjectCapability, requireUser } from "./access";
import { db } from "./db";
import * as schema from "./db/schema";

const INVITATION_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const slugInput = z.object({ slug: z.string().min(1) });
const emailInput = z
  .string()
  .trim()
  .pipe(z.email())
  .transform((value) => value.toLowerCase());

const inviter = alias(schema.user, "inviter");

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export const listInvitations = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "manage_members");

    return db
      .select({
        id: schema.projectInvitation.id,
        email: schema.projectInvitation.email,
        role: schema.projectInvitation.role,
        createdAt: schema.projectInvitation.createdAt,
        expiresAt: schema.projectInvitation.expiresAt,
      })
      .from(schema.projectInvitation)
      .where(
        and(
          eq(schema.projectInvitation.projectId, access.project.id),
          eq(schema.projectInvitation.status, "pending"),
          gt(schema.projectInvitation.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(schema.projectInvitation.createdAt));
  });

export const inviteMember = createServerFn({ method: "POST" })
  .validator(slugInput.extend({ email: emailInput, role: z.enum(invitableRoles) }))
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "manage_members");
    if (!canAssignRole(access.role, data.role)) throw new Error("You cannot invite with that role");

    const [member] = await db
      .select({ id: schema.projectMember.id })
      .from(schema.projectMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.projectMember.userId))
      .where(
        and(
          eq(schema.projectMember.projectId, access.project.id),
          eq(schema.user.email, data.email),
        ),
      )
      .limit(1);
    if (member) throw new Error("That person is already a member of this project");

    await db
      .update(schema.projectInvitation)
      .set({ status: "revoked" })
      .where(
        and(
          eq(schema.projectInvitation.projectId, access.project.id),
          eq(schema.projectInvitation.email, data.email),
          eq(schema.projectInvitation.status, "pending"),
        ),
      );

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    await db.insert(schema.projectInvitation).values({
      projectId: access.project.id,
      email: data.email,
      role: data.role,
      tokenHash: hashToken(token),
      expiresAt,
      invitedById: access.user.id,
    });

    return { token, expiresAt };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .validator(slugInput.extend({ invitationId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "manage_members");

    await db
      .update(schema.projectInvitation)
      .set({ status: "revoked" })
      .where(
        and(
          eq(schema.projectInvitation.id, data.invitationId),
          eq(schema.projectInvitation.projectId, access.project.id),
          eq(schema.projectInvitation.status, "pending"),
        ),
      );

    return { ok: true };
  });

export const getInvitationByToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const [row] = await db
      .select({
        email: schema.projectInvitation.email,
        role: schema.projectInvitation.role,
        status: schema.projectInvitation.status,
        expiresAt: schema.projectInvitation.expiresAt,
        projectName: schema.project.name,
        projectSlug: schema.project.slug,
        inviterName: inviter.name,
      })
      .from(schema.projectInvitation)
      .innerJoin(schema.project, eq(schema.project.id, schema.projectInvitation.projectId))
      .innerJoin(inviter, eq(inviter.id, schema.projectInvitation.invitedById))
      .where(
        and(
          eq(schema.projectInvitation.tokenHash, hashToken(data.token)),
          isNull(schema.project.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      projectName: row.projectName,
      projectSlug: row.projectSlug,
      inviterName: row.inviterName,
      role: row.role,
      status: row.status,
      expired: row.expiresAt.getTime() < Date.now(),
      email: maskEmail(row.email),
    };
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireUser();

    const [row] = await db
      .select({
        id: schema.projectInvitation.id,
        email: schema.projectInvitation.email,
        role: schema.projectInvitation.role,
        status: schema.projectInvitation.status,
        expiresAt: schema.projectInvitation.expiresAt,
        projectId: schema.project.id,
        projectSlug: schema.project.slug,
      })
      .from(schema.projectInvitation)
      .innerJoin(schema.project, eq(schema.project.id, schema.projectInvitation.projectId))
      .where(
        and(
          eq(schema.projectInvitation.tokenHash, hashToken(data.token)),
          isNull(schema.project.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new Error("Invitation not found");
    if (row.status !== "pending") throw new Error("This invitation is no longer valid");
    if (row.expiresAt.getTime() < Date.now()) throw new Error("This invitation has expired");
    if (row.email !== user.email.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address");
    }

    return db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(schema.projectInvitation)
        .set({ status: "accepted", acceptedById: user.id })
        .where(
          and(
            eq(schema.projectInvitation.id, row.id),
            eq(schema.projectInvitation.status, "pending"),
          ),
        )
        .returning({ id: schema.projectInvitation.id });

      if (!claimed) throw new Error("This invitation is no longer valid");

      await tx
        .insert(schema.projectMember)
        .values({ projectId: row.projectId, userId: user.id, role: row.role })
        .onConflictDoNothing();

      return { projectSlug: row.projectSlug };
    });
  });
