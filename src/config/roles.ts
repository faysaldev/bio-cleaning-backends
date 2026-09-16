export const roles = [
  "owner",
  "admin",
  "manager",
  "dispatcher",
  "cleaner",
  "support",
  "read_only",
  "user",
] as const;

export const Role = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  DISPATCHER: "dispatcher",
  CLEANER: "cleaner",
  SUPPORT: "support",
  READ_ONLY: "read_only",
  USER: "user",
} as const;

export type RoleType = (typeof roles)[number];

export const managementRoles: RoleType[] = [
  Role.OWNER,
  Role.ADMIN,
  Role.MANAGER,
  Role.DISPATCHER,
  Role.SUPPORT,
  Role.READ_ONLY,
];

export const operationalWriteRoles: RoleType[] = [
  Role.OWNER,
  Role.ADMIN,
  Role.MANAGER,
  Role.DISPATCHER,
];

export const teamAdminRoles: RoleType[] = [Role.OWNER, Role.ADMIN, Role.MANAGER];
export const ownerAdminRoles: RoleType[] = [Role.OWNER, Role.ADMIN];

export const canAccessAdmin = (role?: string) =>
  Boolean(role && managementRoles.includes(role as RoleType));
