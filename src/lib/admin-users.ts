import { supabase } from "@/integrations/supabase/client";
import type { AccountStatus, AccountType } from "@/lib/access";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: AccountStatus;
  force_password_change: boolean;
  seller_id: string | null;
  call_center_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  account_type: AccountType;
};

export type AdminActivityRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
  acting_for_id: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  target_name?: string | null;
  target_email?: string | null;
};

export type AdminUserDetail = {
  profile: AdminUserRow | null;
  roles: AccountType[];
  seller: {
    id: string;
    name: string;
    category: string;
    status: string;
    balance: number;
    score: number;
    orders_count: number;
    confirmed_count: number;
    total_amount: number;
  } | null;
  call_center: {
    id: string;
    name: string;
    code: string;
    status: string;
    score: number;
    orders_count: number;
    confirmed_count: number;
    calls_count: number;
  } | null;
  activity: AdminActivityRow[];
};

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc("admin_users_list");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminUserRow[];
}

export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const { data, error } = await supabase.rpc("admin_user_detail", { _id: id });
  if (error) throw new Error(error.message);
  return data as unknown as AdminUserDetail;
}

export async function fetchAdminActivity(limit = 200): Promise<AdminActivityRow[]> {
  const { data, error } = await supabase.rpc("admin_activity_log", { _limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminActivityRow[];
}

export const ACTION_LABELS: Record<string, string> = {
  "auth.login": "تسجيل دخول",
  "auth.logout": "تسجيل خروج",
  "admin.user.update_contact": "تعديل بيانات مستخدم",
  "admin.user.status": "تغيير حالة حساب",
  "admin.user.signout_all": "إنهاء جميع الجلسات",
  "admin.user.reset_password": "إعادة تعيين كلمة المرور",
  "admin.user.force_password_change": "إجبار تغيير كلمة المرور",
  "admin.user.set_role": "تغيير دور المستخدم",
  "admin.employee.create": "إنشاء موظف",
  "admin.acting_as.start": "الدخول نيابة عن مستخدم",
  "admin.role_permission.grant": "منح صلاحية لدور",
  "admin.role_permission.revoke": "سحب صلاحية من دور",
};

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}
