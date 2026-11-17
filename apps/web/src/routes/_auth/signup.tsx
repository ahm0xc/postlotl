import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_auth/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);
    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed");
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Create account</h1>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" minLength={8} required />
      <button type="submit" disabled={pending}>
        Sign up
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        Have an account? <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
