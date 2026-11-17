import { Hono } from "hono";
import { sql } from "drizzle-orm";

import { db } from "./db/index.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ status: "ok", postgres: { healthy: true } });
  } catch {
    return c.json({ status: "error", postgres: { healthy: false } }, 503);
  }
});

export default app;
