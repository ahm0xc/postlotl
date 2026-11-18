CREATE TYPE "project_role" AS ENUM('viewer', 'developer', 'admin', 'owner');--> statement-breakpoint
CREATE TABLE "project_invitation" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "project_role" NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"invited_by_id" text NOT NULL,
	"accepted_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "project_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_organization_id_organization_id_fkey";--> statement-breakpoint
ALTER TABLE "member" DROP CONSTRAINT "member_organization_id_organization_id_fkey";--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_organization_id_organization_id_fkey";--> statement-breakpoint
DROP TABLE "invitation";--> statement-breakpoint
DROP TABLE "member";--> statement-breakpoint
DROP TABLE "organization";--> statement-breakpoint
DROP INDEX "project_organizationId_idx";--> statement-breakpoint
DROP INDEX "project_organization_slug_uidx";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_project_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "active_organization_id";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "onboarding_completed";--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_uidx" ON "project" ("slug");--> statement-breakpoint
CREATE INDEX "project_deletedAt_idx" ON "project" ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitation_token_hash_uidx" ON "project_invitation" ("token_hash");--> statement-breakpoint
CREATE INDEX "project_invitation_projectId_idx" ON "project_invitation" ("project_id");--> statement-breakpoint
CREATE INDEX "project_invitation_email_idx" ON "project_invitation" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_project_user_uidx" ON "project_member" ("project_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_owner_uidx" ON "project_member" ("project_id") WHERE "role" = 'owner';--> statement-breakpoint
CREATE INDEX "project_member_userId_idx" ON "project_member" ("user_id");--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_invited_by_id_user_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_accepted_by_id_user_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT;