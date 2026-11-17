import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";

import { db } from "~/server/db";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`select 1`);
          return Response.json({ status: "ok", postgres: { healthy: true } });
        } catch {
          return Response.json({ status: "error", postgres: { healthy: false } }, { status: 503 });
        }
      },
    },
  },
});
