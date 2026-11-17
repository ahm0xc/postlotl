import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { db } from "./db";
import * as schema from "./db/schema";
import { env } from "./env";
import { generateUniqueSlug } from "./slug";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      onboardingCompleted: { type: "boolean", defaultValue: false, input: false },
    },
  },
  plugins: [
    organization({
      organizationHooks: {
        beforeCreateOrganization: async ({ organization: data }) => {
          const slug = await generateUniqueSlug(data.name ?? "", async (candidate) => {
            const [existing] = await db
              .select({ id: schema.organization.id })
              .from(schema.organization)
              .where(eq(schema.organization.slug, candidate))
              .limit(1);
            return existing !== undefined;
          });

          return { data: { ...data, slug } };
        },
      },
    }),
  ],
});
