import { Hono } from "hono";

import { routes } from "./routes/index.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello there!");
});

app.route("/", routes);

export default app;
