ALTER TABLE "project" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_slug_uidx" ON "project" ("organization_id","slug");
