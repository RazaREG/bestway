/** @typedef {{ role: string, role_id?: string | null }} UserRoleEntry */

/**
 * Normalize app_users row to a list of role assignments.
 * Supports legacy single `role` / `role_id` and new `roles` jsonb array.
 * @returns {UserRoleEntry[]}
 */
export function normalizeUserRoles(user) {
  if (!user) return [];

  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles
      .map((r) => {
        if (typeof r === "string") return { role: r, role_id: null };
        return { role: r.role, role_id: r.role_id || null };
      })
      .filter((r) => r.role);
  }

  if (user.role) {
    return [{ role: user.role, role_id: user.role_id || null }];
  }

  return [];
}

export function hasRole(user, roleName) {
  return normalizeUserRoles(user).some((r) => r.role === roleName);
}

export function hasAnyRole(user, allowed = []) {
  const names = normalizeUserRoles(user).map((r) => r.role);
  return allowed.some((a) => names.includes(a));
}

export function isAdminOrSubAdmin(user) {
  return hasAnyRole(user, ["admin", "sub-admin"]);
}

export function getCrewRoleIds(user) {
  return normalizeUserRoles(user)
    .filter((r) => r.role?.startsWith("crew_") && r.role_id)
    .map((r) => r.role_id);
}

export function userBelongsToCrew(user, crewId) {
  if (!crewId) return false;
  return getCrewRoleIds(user).includes(crewId);
}

export function getPrimaryRole(user) {
  const roles = normalizeUserRoles(user).map((r) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("sub-admin")) return "sub-admin";
  const crew = normalizeUserRoles(user).find((r) => r.role?.startsWith("crew_"));
  return crew?.role || roles[0] || null;
}

/** Session object stored in localStorage after login */
export function buildUserSession(userRow) {
  const roles = normalizeUserRoles(userRow);
  const primary = getPrimaryRole(userRow);
  const primaryEntry =
    roles.find((r) => r.role === primary) || roles[0] || { role: null, role_id: null };

  return {
    id: userRow.id,
    email: userRow.email,
    role: primary,
    role_id: primaryEntry.role?.startsWith("crew_") ? primaryEntry.role_id : null,
    roles,
    inventory_access: userRow.inventory_access,
  };
}

/**
 * @param {UserRoleEntry[]} selectedRoles
 */
export function rolesToDbFields(selectedRoles) {
  if (!selectedRoles?.length) {
    throw new Error("At least one role is required");
  }

  const primary = getPrimaryRole({ roles: selectedRoles });
  const primaryEntry =
    selectedRoles.find((r) => r.role === primary) || selectedRoles[0];

  return {
    roles: selectedRoles,
    role: primary,
    role_id: primaryEntry.role?.startsWith("crew_") ? primaryEntry.role_id : null,
  };
}

export function getRoleDisplayLabel(roleEntry, crewRoles = []) {
  const { role, role_id } = roleEntry;
  if (role?.startsWith("crew_") && role_id) {
    const crew = crewRoles.find((c) => c.id === role_id);
    return crew?.name || role;
  }
  if (role === "sub-admin") return "Sub Admin";
  if (role === "admin") return "Admin";
  return role;
}
