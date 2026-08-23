import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ userId: z.string().uuid() });

const contactSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(30).optional(),
});

const employeeSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(["employee", "management"]),
});

const statusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended", "disabled"]),
});

const forceSchema = z.object({ userId: z.string().uuid(), force: z.boolean() });

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("FORBIDDEN");
}

async function writeLog(
  context: { supabase: { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } }; userId: string },
  action: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  await context.supabase.from("activity_log").insert({
    actor_id: context.userId,
    acting_for_id: targetId,
    action,
    entity_type: "user",
    entity_id: targetId,
    details,
  });
}

function tempPassword() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return (
    "Ks" +
    Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("") +
    "#7"
  );
}

/** تعديل بيانات التواصل للمستخدم (الاسم / البريد / الهاتف). */
export const adminUpdateUserContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.email || data.phone !== undefined) {
      const payload: Record<string, unknown> = {};
      if (data.email) payload["email"] = data.email;
      if (data.phone) payload["phone"] = data.phone.replace(/[^\d+]/g, "");
      if (data.email) payload["email_confirm"] = true;
      if (Object.keys(payload).length > 0) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, payload as never);
        if (error && !/phone/i.test(error.message)) throw new Error(error.message);
      }
    }

    const update: Record<string, unknown> = {};
    if (data.fullName !== undefined) update["full_name"] = data.fullName;
    if (data.email !== undefined) update["email"] = data.email;
    if (data.phone !== undefined) update["phone"] = data.phone;

    if (Object.keys(update).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(update as never).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }

    await writeLog(context as never, "admin.user.update_contact", data.userId, update);
    return { ok: true };
  });

/** تغيير حالة الحساب مع إنهاء الجلسات عند الحظر أو التعطيل. */
export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === context.userId && data.status !== "active") {
      throw new Error("لا يمكنك تعطيل حسابك الخاص.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status } as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    if (data.status !== "active") {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ban_duration: "876000h",
      } as never);
      await signOutEverywhere(data.userId);
    } else {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" } as never);
    }

    await writeLog(context as never, "admin.user.status", data.userId, { status: data.status });
    return { ok: true };
  });

async function signOutEverywhere(userId: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server configuration");
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}/logout`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ scope: "global" }),
  });
  if (!res.ok && res.status !== 404) throw new Error(`فشل إنهاء الجلسات (${res.status})`);
}

/** إنهاء جميع جلسات المستخدم. */
export const adminSignOutAllSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    await signOutEverywhere(data.userId);
    await writeLog(context as never, "admin.user.signout_all", data.userId);
    return { ok: true };
  });

/** إعادة تعيين كلمة المرور بكلمة مؤقتة تُعرض للمشرف مرة واحدة. */
export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = tempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ force_password_change: true, password_set: false } as never)
      .eq("id", data.userId);
    await signOutEverywhere(data.userId);
    await writeLog(context as never, "admin.user.reset_password", data.userId);
    return { password };
  });

/** إجبار المستخدم على تغيير كلمة المرور عند الدخول القادم. */
export const adminSetForcePasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => forceSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ force_password_change: data.force } as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await writeLog(context as never, "admin.user.force_password_change", data.userId, { force: data.force });
    return { ok: true };
  });

/** إنشاء حساب موظف / إدارة من داخل لوحة Admin. */
export const adminCreateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => employeeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, account_type: "management", phone: data.phone ?? null },
    });
    if (error || !created.user) throw new Error(error?.message ?? "تعذر إنشاء الحساب");

    const userId = created.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role } as never);
    if (roleError) throw new Error(roleError.message);

    await supabaseAdmin
      .from("profiles")
      .update({ phone: data.phone ?? null, force_password_change: true } as never)
      .eq("id", userId);

    await writeLog(context as never, "admin.employee.create", userId, { role: data.role, email: data.email });
    return { userId };
  });

/** تعيين دور واحد للمستخدم. */
export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "management", "employee", "seller", "call_center", "user"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("لا يمكنك إزالة صلاحية المشرف عن حسابك.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role } as never);
    if (error) throw new Error(error.message);
    await writeLog(context as never, "admin.user.set_role", data.userId, { role: data.role });
    return { ok: true };
  });
