import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { can, canAssignRole, invitableRoles } from "../lib/permissions";
import { requireProjectAccess, requireProjectCapability } from "./access";
import { db } from "./db";
import * as schema from "./db/schema";

const slugInput = z.object({ slug: z.string().min(1) });

async function findMember(projectId: string, userId: string) {
  const [member] = await db
    .select({ id: schema.projectMember.id, role: schema.projectMember.role })
    .from(schema.projectMember)
    .where(
      and(eq(schema.projectMember.projectId, projectId), eq(schema.projectMember.userId, userId)),
    )
    .limit(1);
  return member;
}

export const listMembers = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(async ({ data }) => {
    const access = await requireProjectAccess(data.slug);

    return db
      .select({
        userId: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.projectMember.role,
        joinedAt: schema.projectMember.createdAt,
      })
      .from(schema.projectMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.projectMember.userId))
      .where(eq(schema.projectMember.projectId, access.project.id))
      .orderBy(asc(schema.projectMember.createdAt));
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .validator(slugInput.extend({ userId: z.string().min(1), role: z.enum(invitableRoles) }))
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "manage_members");
    if (!canAssignRole(access.role, data.role)) {
      throw new Error("You cannot assign that role");
    }

    const member = await findMember(access.project.id, data.userId);
    if (!member) throw new Error("That user is not a member of this project");
    if (member.role === "owner") throw new Error("The owner role cannot be changed here");
    if (member.role === "admin" && !can(access.role, "manage_admins")) {
      throw new Error("Only the owner can manage admins");
    }

    await db
      .update(schema.projectMember)
      .set({ role: data.role })
      .where(eq(schema.projectMember.id, member.id));

    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .validator(slugInput.extend({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const access = await requireProjectCapability(data.slug, "manage_members");
    if (data.userId === access.user.id) throw new Error("Leave the project instead");

    const member = await findMember(access.project.id, data.userId);
    if (!member) throw new Error("That user is not a member of this project");
    if (member.role === "owner") throw new Error("The owner cannot be removed");
    if (member.role === "admin" && !can(access.role, "manage_admins")) {
      throw new Error("Only the owner can remove admins");
    }

    await db.delete(schema.projectMember).where(eq(schema.projectMember.id, member.id));

    return { ok: true };
  });

export const leaveProject = createServerFn({ method: "POST" })
  .validator(slugInput)
  .handler(async ({ data }) => {
    const access = await requireProjectAccess(data.slug);
    if (access.role === "owner") {
      throw new Error("Transfer ownership before leaving this project");
    }

    await db
      .delete(schema.projectMember)
      .where(
        and(
          eq(schema.projectMember.projectId, access.project.id),
          eq(schema.projectMember.userId, access.user.id),
        ),
      );

    return { ok: true };
  });
