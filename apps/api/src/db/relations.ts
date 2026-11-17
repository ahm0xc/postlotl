import { defineRelations } from "drizzle-orm";

import * as schema from "./schema.js";

export const relations = defineRelations(schema, (r) => ({
  users: {
    todos: r.many.todos({
      from: r.users.id,
      to: r.todos.userId,
    }),
  },
  todos: {
    user: r.one.users({
      from: r.todos.userId,
      to: r.users.id,
      optional: false,
    }),
  },
}));
