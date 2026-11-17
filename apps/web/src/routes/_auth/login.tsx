import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_auth/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Sign in</h1>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit" disabled={pending}>
        Sign in
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </form>
  );
}
