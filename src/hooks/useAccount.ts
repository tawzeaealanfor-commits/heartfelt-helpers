import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  primaryAccountType,
  type AccountStatus,
  type AccountType,
} from "@/lib/access";

export type Account = {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: AccountStatus;
  forcePasswordChange: boolean;
  passwordSet: boolean;
  sellerId: string | null;
  callCenterId: string | null;
  roles: AccountType[];
  accountType: AccountType;
  isAdmin: boolean;
};

export async function fetchAccount(): Promise<Account | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, full_name, avatar_url, phone, status, force_password_change, password_set, seller_id, call_center_id",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const roles = (roleRows ?? []).map((r) => r.role as AccountType);
  const accountType = primaryAccountType(roles);

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
    status: (profile?.status as AccountStatus) ?? "active",
    forcePasswordChange: profile?.force_password_change ?? false,
    passwordSet: profile?.password_set ?? false,
    sellerId: profile?.seller_id ?? null,
    callCenterId: profile?.call_center_id ?? null,
    roles,
    accountType,
    isAdmin: roles.includes("admin"),
  };
}

export function useAccount() {
  return useQuery({ queryKey: ["account"], queryFn: fetchAccount, staleTime: 30_000 });
}

export async function logActivity(
  action: string,
  options: {
    entityType?: string | null | undefined;
    entityId?: string | null | undefined;
    details?: Record<string, unknown> | undefined;
    actingForId?: string | null | undefined;
  } = {},
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("activity_log").insert({
    actor_id: data.user.id,
    acting_for_id: options.actingForId ?? null,
    action,
    entity_type: options.entityType ?? null,
    entity_id: options.entityId ?? null,
    details: (options.details ?? {}) as never,
  });
}
