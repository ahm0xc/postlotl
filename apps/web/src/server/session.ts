import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "./auth";

export const getSessionState = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) return null;

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    onboardingCompleted: session.user.onboardingCompleted === true,
  };
});
