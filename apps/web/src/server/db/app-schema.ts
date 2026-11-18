import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const projectRole = pgEnum("project_role", ["viewer", "developer", "admin", "owner"]);

export const project = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("project_slug_uidx").on(table.slug),
    index("project_deletedAt_idx").on(table.deletedAt),
  ],
);

export const projectMember = pgTable(
  "project_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    role: projectRole("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_member_project_user_uidx").on(table.projectId, table.userId),
    uniqueIndex("project_member_owner_uidx")
      .on(table.projectId)
      .where(sql`${table.role} = 'owner'`),
    index("project_member_userId_idx").on(table.userId),
  ],
);

export const projectInvitation = pgTable(
  "project_invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: projectRole("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    acceptedById: text("accepted_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_invitation_token_hash_uidx").on(table.tokenHash),
    index("project_invitation_projectId_idx").on(table.projectId),
    index("project_invitation_email_idx").on(table.email),
  ],
);
