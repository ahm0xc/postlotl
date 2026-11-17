import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "./auth";
import { db } from "./db";
import * as schema from "./db/schema";

export const completeOnboarding = createServerFn({ method: "POST" })
  .validator(z.object({ organizationName: z.string().trim().min(1).max(100) }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [claimed] = await db
      .update(schema.user)
      .set({ onboardingCompleted: true })
      .where(and(eq(schema.user.id, session.user.id), eq(schema.user.onboardingCompleted, false)))
      .returning({ id: schema.user.id });
    if (!claimed) throw new Error("Onboarding already completed");

    try {
      await auth.api.createOrganization({
        body: { name: data.organizationName, slug: "placeholder" },
        headers,
      });
    } catch (error) {
      await db
        .update(schema.user)
        .set({ onboardingCompleted: false })
        .where(eq(schema.user.id, session.user.id));
      throw error;
    }

    return { ok: true };
  });
