export const projectRoles = ["viewer", "developer", "admin", "owner"] as const;

export type ProjectRole = (typeof projectRoles)[number];

export const invitableRoles = ["viewer", "developer", "admin"] as const;

export type InvitableRole = (typeof invitableRoles)[number];

export type Capability =
  | "read"
  | "write"
  | "settings"
  | "manage_members"
  | "manage_admins"
  | "transfer_ownership"
  | "delete_project";

const roleCapabilities: Record<ProjectRole, readonly Capability[]> = {
  viewer: ["read"],
  developer: ["read", "write"],
  admin: ["read", "write", "settings", "manage_members"],
  owner: [
    "read",
    "write",
    "settings",
    "manage_members",
    "manage_admins",
    "transfer_ownership",
    "delete_project",
  ],
};

export function can(role: ProjectRole, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}

export function canAssignRole(actorRole: ProjectRole, targetRole: ProjectRole) {
  if (targetRole === "owner") return false;
  if (targetRole === "admin") return can(actorRole, "manage_admins");
  return can(actorRole, "manage_members");
}

export function assignableRoles(actorRole: ProjectRole): InvitableRole[] {
  return invitableRoles.filter((role) => canAssignRole(actorRole, role));
}
