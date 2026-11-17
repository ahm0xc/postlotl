import { useNavigate } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";

export function useSwitchOrganization() {
  const navigate = useNavigate();
  const { data: organizations } = authClient.useListOrganizations();

  return async function switchOrganization(organizationId: string) {
    const organization = organizations?.find((item) => item.id === organizationId);
    if (!organization) return;
    await authClient.organization.setActive({ organizationId });
    await navigate({ to: "/org/$orgSlug", params: { orgSlug: organization.slug } });
  };
}
