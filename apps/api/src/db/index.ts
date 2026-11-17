import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { relations } from "./relations.js";
import { env } from "../env.js";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool, relations });
