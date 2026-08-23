import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useAccount";

export type StaffRoleStatus = "active" | "disabled";

export type StaffRoleRow = {
  id: string;
  name: string;
  description: string;
  status: StaffRoleStatus;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  employees_count: number;
  permissions_count: number;
};

export type PermissionRow = { key: string; label: string; category: string };

export const ROLE_STATUS_LABELS: Record<StaffRoleStatus, string> = {
  active: "نشط",
  disabled: "معطل",
};

export const ROLE_STATUS_TONE: Record<StaffRoleStatus, string> = {
  active: "bg-success/10 text-success border-success/20",
  disabled: "bg-warning/10 text-warning border-warning/20",
};

export async function fetchStaffRoles(): Promise<StaffRoleRow[]> {
  const { data, error } = await supabase.rpc("staff_roles_overview");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StaffRoleRow[];
}

export async function fetchStaffRole(id: string): Promise<StaffRoleRow | null> {
  const rows = await fetchStaffRoles();
  return rows.find((r) => r.id === id) ?? null;
}

export async function fetchPermissions(): Promise<PermissionRow[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("key, label, category")
    .order("category")
    .order("key");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff_role_permissions")
    .select("permission")
    .eq("role_id", roleId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.permission);
}

export async function fetchMyPermissions(): Promise<string[]> {
  const { data, error } = await supabase.rpc("my_permissions");
  if (error) throw new Error(error.message);
  return (data ?? []) as string[];
}

export async function createStaffRole(input: {
  name: string;
  description: string;
  status: StaffRoleStatus;
  permissions: string[];
}) {
  const name = input.name.trim();
  if (!name) throw new Error("يرجى إدخال اسم الدور.");

  const { data, error } = await supabase
    .from("staff_roles")
    .insert({ name, description: input.description.trim(), status: input.status })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.permissions.length > 0) {
    const { error: permError } = await supabase
      .from("staff_role_permissions")
      .insert(input.permissions.map((permission) => ({ role_id: data.id, permission })));
    if (permError) throw new Error(permError.message);
  }

  await logActivity("admin.role.create", {
    entityType: "staff_role",
    entityId: data.id,
    details: { name, permissions: input.permissions },
  });
  return data.id;
}

export async function updateStaffRole(
  roleId: string,
  patch: { name?: string; description?: string; status?: StaffRoleStatus },
) {
  const { error } = await supabase.from("staff_roles").update(patch).eq("id", roleId);
  if (error) throw new Error(error.message);
  await logActivity("admin.role.update", {
    entityType: "staff_role",
    entityId: roleId,
    details: patch as Record<string, unknown>,
  });
}

export async function deleteStaffRole(roleId: string) {
  const { error } = await supabase.from("staff_roles").delete().eq("id", roleId);
  if (error) throw new Error(error.message);
  await logActivity("admin.role.delete", { entityType: "staff_role", entityId: roleId });
}

export async function duplicateStaffRole(role: StaffRoleRow) {
  const permissions = await fetchRolePermissions(role.id);
  return createStaffRole({
    name: `${role.name} - نسخة`,
    description: role.description,
    status: "disabled",
    permissions,
  });
}

/** يحفظ الصلاحيات ويسجل الفروقات (المضاف/المحذوف) في سجل النشاطات. */
export async function saveRolePermissions(roleId: string, next: string[]) {
  const current = await fetchRolePermissions(roleId);
  const added = next.filter((p) => !current.includes(p));
  const removed = current.filter((p) => !next.includes(p));

  if (removed.length > 0) {
    const { error } = await supabase
      .from("staff_role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission", removed);
    if (error) throw new Error(error.message);
  }
  if (added.length > 0) {
    const { error } = await supabase
      .from("staff_role_permissions")
      .insert(added.map((permission) => ({ role_id: roleId, permission })));
    if (error) throw new Error(error.message);
  }
  if (added.length === 0 && removed.length === 0) return { added, removed };

  await logActivity("admin.role_permission.update", {
    entityType: "staff_role",
    entityId: roleId,
    details: { added, removed, before: current, after: next },
  });
  return { added, removed };
}

export async function assignStaffRole(userId: string, roleId: string | null) {
  const { error } = await supabase.from("profiles").update({ staff_role_id: roleId }).eq("id", userId);
  if (error) throw new Error(error.message);
  await logActivity("admin.employee.set_staff_role", {
    entityType: "user",
    entityId: userId,
    actingForId: userId,
    details: { staff_role_id: roleId },
  });
}

export async function fetchUserPermissions(userId: string) {
  const { data, error } = await supabase
    .from("user_permissions")
    .select("permission, granted")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setUserPermission(userId: string, permission: string, granted: boolean | null) {
  if (granted === null) {
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("permission", permission);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_permissions")
      .upsert({ user_id: userId, permission, granted }, { onConflict: "user_id,permission" });
    if (error) throw new Error(error.message);
  }
  await logActivity("admin.user_permission.update", {
    entityType: "user",
    entityId: userId,
    actingForId: userId,
    details: { permission, granted },
  });
}

export function groupPermissions(permissions: PermissionRow[]) {
  const groups = new Map<string, PermissionRow[]>();
  for (const permission of permissions) {
    const list = groups.get(permission.category) ?? [];
    list.push(permission);
    groups.set(permission.category, list);
  }
  return Array.from(groups.entries());
}
