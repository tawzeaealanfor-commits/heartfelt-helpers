import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type AdminDashboardData = {
  range: { from: string; to: string; days: number };
  platform_status: { status: "normal" | "pressure" | "late"; reason: string };
  attention: {
    late_orders: number;
    unhandled_orders: number;
    pending_withdrawals: number;
    pending_deposits: number;
    open_complaints: number;
  };
  key_numbers: {
    total_orders: number;
    avg_daily_orders: number;
    success_rate: number;
    avg_first_attempt_minutes: number;
    avg_call_seconds: number;
    avg_attempts: number;
    late_response_rate: number;
    total_incentives: number;
    calls_done: number;
  };
  sellers: {
    total: number;
    active: number;
    active_rate: number;
    avg_orders_per_seller: number;
  };
  call_centers: {
    total: number;
    active: number;
    active_rate: number;
    avg_calls_per_center_daily: number;
  };
  finance: {
    seller_dues: number;
    callcenter_dues: number;
    platform_balance: number;
    platform_profit: number;
    total_incentives: number;
  };
  peak: { start_hour: number | null; end_hour: number | null; avg_orders: number };
};

export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeSchema.parse(data))
  .handler(async ({ data, context }): Promise<AdminDashboardData> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("FORBIDDEN");

    const { data: result, error } = await context.supabase.rpc("admin_dashboard", {
      _from: data.from,
      _to: data.to,
    });
    if (error) throw new Error(error.message);
    return result as unknown as AdminDashboardData;
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: isAdmin }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, password_set")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    return { profile, isAdmin: Boolean(isAdmin) };
  });

export const markPasswordSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
