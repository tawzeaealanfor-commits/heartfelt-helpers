import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAccount, logActivity } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCOUNT_STATUS_LABELS,
  PORTAL_ACCOUNT_TYPE,
  PORTAL_ALLOWED_TYPES,
  PORTAL_LABELS,
  PORTAL_SIGNUP_ENABLED,
  dashboardPathFor,
  loginPathFor,
  signupPathFor,
  type Portal,
} from "@/lib/access";

export function PortalAuth({ portal, mode }: { portal: Portal; mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // مستخدم مسجّل الدخول بالفعل → إلى لوحته مباشرة
  useEffect(() => {
    let cancelled = false;
    fetchAccount().then((account) => {
      if (cancelled) return;
      if (account && account.status === "active") {
        navigate({ to: dashboardPathFor(account.accountType), replace: true });
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const finishLogin = async () => {
    const account = await fetchAccount();
    if (!account) throw new Error("تعذر تحميل بيانات الحساب.");

    if (!PORTAL_ALLOWED_TYPES[portal].includes(account.accountType)) {
      await supabase.auth.signOut();
      throw new Error("لا يوجد حساب بهذه البيانات في هذه البوابة.");
    }
    if (account.status !== "active") {
      await supabase.auth.signOut();
      throw new Error(`الحساب ${ACCOUNT_STATUS_LABELS[account.status]}. يرجى التواصل مع الإدارة.`);
    }

    await supabase.from("profiles").update({ last_sign_in_at: new Date().toISOString() }).eq("id", account.userId);
    await logActivity("auth.login", { entityType: "user", entityId: account.userId, details: { portal } });
    await queryClient.invalidateQueries();
    navigate({ to: dashboardPathFor(account.accountType), replace: true });
  };

  const submit = async () => {
    if (!email || !password || (mode === "signup" && !fullName)) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${loginPathFor(portal)}`,
            data: {
              full_name: fullName,
              phone,
              account_type: PORTAL_ACCOUNT_TYPE[portal],
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setPendingConfirm(true);
          return;
        }
        await supabase.from("profiles").update({ password_set: true }).eq("id", data.user!.id);
        await finishLogin();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await finishLogin();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${loginPathFor(portal)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول عبر Google.");
      setLoading(false);
    }
  };


  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-app-canvas" />;
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-app-canvas px-4">
      <Card className="w-full max-w-md rounded-xl shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">{PORTAL_LABELS[portal]}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingConfirm ? (
            <div className="space-y-4 text-center">
              <p className="text-sm">
                تم إنشاء الحساب. يرجى فتح رسالة التأكيد في بريدك الإلكتروني ثم تسجيل الدخول.
              </p>
              <Button asChild className="w-full rounded-full">
                <Link to={loginPathFor(portal)}>الانتقال إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : (
            <>
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full-name">الاسم</Label>
                    <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input id="phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <Button className="w-full rounded-full" disabled={loading} onClick={submit}>
                {mode === "login" ? "دخول" : "إنشاء الحساب"}
              </Button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">أو</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-full"
                disabled={loading}
                onClick={signInWithGoogle}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
                  <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 7 8.9 4.8 12 4.8z" />
                </svg>
                {mode === "login" ? "الدخول عبر Google" : "المتابعة عبر Google"}
              </Button>



              {PORTAL_SIGNUP_ENABLED[portal] && (
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "login" ? (
                    <>
                      ليس لديك حساب؟{" "}
                      <Link to={signupPathFor(portal)} className="font-medium text-primary hover:underline">
                        إنشاء حساب
                      </Link>
                    </>
                  ) : (
                    <>
                      لديك حساب بالفعل؟{" "}
                      <Link to={loginPathFor(portal)} className="font-medium text-primary hover:underline">
                        تسجيل الدخول
                      </Link>
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
