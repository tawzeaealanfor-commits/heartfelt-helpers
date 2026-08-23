import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ExternalLink, KeyRound, LogOut, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logActivity } from "@/hooks/useAccount";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONE,
  ACCOUNT_TYPE_LABELS,
  type AccountStatus,
  type AccountType,
} from "@/lib/access";
import { actionLabel, fetchAdminUserDetail, formatDateTime } from "@/lib/admin-users";
import {
  adminResetPassword,
  adminSetForcePasswordChange,
  adminSetUserRole,
  adminSetUserStatus,
  adminSignOutAllSessions,
  adminUpdateUserContact,
} from "@/lib/admin-users.functions";
import { nf } from "@/lib/format";

const description = "ملف المستخدم داخل لوحة إدارة Kassebni_Call2Sell: البيانات، الأمان، الإحصائيات والنشاط.";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  head: () => ({
    meta: [
      { title: "ملف المستخدم | لوحة تحكم Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "ملف المستخدم | لوحة تحكم Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UserProfilePage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function UserProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detail = useQuery({ queryKey: ["admin-user", id], queryFn: () => fetchAdminUserDetail(id) });
  const profile = detail.data?.profile ?? null;

  const updateContact = useServerFn(adminUpdateUserContact);
  const setStatus = useServerFn(adminSetUserStatus);
  const signOutAll = useServerFn(adminSignOutAllSessions);
  const resetPassword = useServerFn(adminResetPassword);
  const setForce = useServerFn(adminSetForcePasswordChange);
  const setRole = useServerFn(adminSetUserRole);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setEmail(profile.email);
    setPhone(profile.phone ?? "");
  }, [profile]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const run = <T,>(fn: () => Promise<T>, success: string) =>
    fn()
      .then(async (result) => {
        toast.success(success);
        await refresh();
        return result;
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "تعذر تنفيذ العملية.");
        throw error;
      });

  const saveContact = useMutation({
    mutationFn: () =>
      run(
        () => updateContact({ data: { userId: id, fullName, email, phone } }),
        "تم تحديث بيانات المستخدم.",
      ),
  });

  const changeStatus = useMutation({
    mutationFn: (status: AccountStatus) =>
      run(() => setStatus({ data: { userId: id, status } }), "تم تحديث حالة الحساب."),
  });

  const changeRole = useMutation({
    mutationFn: (role: AccountType) =>
      run(() => setRole({ data: { userId: id, role } }), "تم تحديث دور المستخدم."),
  });

  const doReset = useMutation({
    mutationFn: async () => {
      const result = await run(() => resetPassword({ data: { userId: id } }), "تم إنشاء كلمة مرور مؤقتة.");
      setTempPassword((result as { password: string }).password);
    },
  });

  const doSignOutAll = useMutation({
    mutationFn: () => run(() => signOutAll({ data: { userId: id } }), "تم إنهاء جميع الجلسات."),
  });

  const toggleForce = useMutation({
    mutationFn: (force: boolean) =>
      run(() => setForce({ data: { userId: id, force } }), "تم تحديث إعداد كلمة المرور."),
  });

  if (detail.isLoading) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminShell>
    );
  }

  if (!profile) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-lg font-semibold">لم يتم العثور على هذا المستخدم.</p>
          <Button asChild variant="outline">
            <Link to="/admin/users">العودة إلى المستخدمين</Link>
          </Button>
        </div>
      </AdminShell>
    );
  }

  const type = profile.account_type;
  const dashboardPath =
    type === "seller"
      ? "/seller/dashboard"
      : type === "call_center"
        ? "/callcenter/dashboard"
        : type === "management" || type === "employee"
          ? "/management/dashboard"
          : null;

  const openDashboard = async () => {
    if (!dashboardPath) return;
    await logActivity("admin.acting_as.start", {
      entityType: "user",
      entityId: profile.id,
      actingForId: profile.id,
      details: { account_type: type },
    });
    navigate({ to: dashboardPath, search: { as: profile.id } as never });
  };

  const seller = detail.data?.seller ?? null;
  const callCenter = detail.data?.call_center ?? null;
  const activity = detail.data?.activity ?? [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/admin/users">
            <ArrowRight className="size-4" />
            العودة إلى المستخدمين
          </Link>
        </Button>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <Avatar className="size-16">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? profile.email} />}
              <AvatarFallback>{(profile.full_name ?? profile.email).slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="truncate text-xl font-bold">{profile.full_name ?? profile.email}</h1>
              <p className="truncate text-sm text-muted-foreground" dir="ltr">
                {profile.email}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline">{ACCOUNT_TYPE_LABELS[type]}</Badge>
                <Badge variant="outline" className={ACCOUNT_STATUS_TONE[profile.status]}>
                  {ACCOUNT_STATUS_LABELS[profile.status]}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {dashboardPath && (
                <Button onClick={openDashboard} className="gap-2 rounded-full">
                  <ExternalLink className="size-4" />
                  عرض لوحة التحكم
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                disabled={doReset.isPending}
                onClick={() => doReset.mutate()}
              >
                <KeyRound className="size-4" />
                إعادة تعيين كلمة المرور
              </Button>
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                disabled={doSignOutAll.isPending}
                onClick={() => doSignOutAll.mutate()}
              >
                <LogOut className="size-4" />
                إنهاء الجلسات
              </Button>
              {profile.status === "active" ? (
                <>
                  <Button variant="outline" className="rounded-full" onClick={() => setPendingStatus("suspended")}>
                    حظر المستخدم
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setPendingStatus("disabled")}>
                    تعطيل الحساب
                  </Button>
                </>
              ) : (
                <Button className="rounded-full" onClick={() => changeStatus.mutate("active")}>
                  إعادة تفعيل الحساب
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {tempPassword && (
          <Card className="rounded-xl border-warning/40 bg-warning/10 shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span className="flex items-center gap-2 font-medium text-warning">
                <ShieldAlert className="size-4" />
                كلمة مرور مؤقتة تُعرض مرة واحدة فقط:
              </span>
              <code dir="ltr" className="rounded bg-background px-3 py-1 font-mono">
                {tempPassword}
              </code>
              <Button size="sm" variant="ghost" onClick={() => setTempPassword(null)}>
                إخفاء
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" dir="rtl">
          <TabsList className="flex w-full flex-wrap">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="data">البيانات</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            <TabsTrigger value="security">الأمان</TabsTrigger>
            <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
            <TabsTrigger value="activity">النشاط</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-4">
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-5">
                <Row label="الاسم" value={profile.full_name ?? "—"} />
                <Row label="البريد الإلكتروني" value={profile.email} />
                <Row label="رقم الهاتف" value={profile.phone ?? "—"} />
                <Row label="نوع الحساب" value={ACCOUNT_TYPE_LABELS[type]} />
                <Row label="حالة الحساب" value={ACCOUNT_STATUS_LABELS[profile.status]} />
                <Row label="تاريخ إنشاء الحساب" value={formatDateTime(profile.created_at)} />
                <Row label="آخر تسجيل دخول" value={formatDateTime(profile.last_sign_in_at)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="pt-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">بيانات التواصل</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="p-name">الاسم</Label>
                  <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-email">البريد الإلكتروني</Label>
                  <Input id="p-email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-phone">رقم الهاتف</Label>
                  <Input id="p-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Button
                    className="rounded-full"
                    disabled={saveContact.isPending}
                    onClick={() => saveContact.mutate()}
                  >
                    حفظ التعديلات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="pt-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">إعدادات الحساب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">دور المستخدم</p>
                    <p className="text-xs text-muted-foreground">يحدد الصلاحيات والبوابة التي يدخل منها.</p>
                  </div>
                  <Select value={type} onValueChange={(v) => changeRole.mutate(v as AccountType)}>
                    <SelectTrigger className="w-48 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACCOUNT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">حالة الحساب</p>
                    <p className="text-xs text-muted-foreground">الحسابات المحظورة أو المعطلة لا يمكنها تسجيل الدخول.</p>
                  </div>
                  <Select
                    value={profile.status}
                    onValueChange={(v) =>
                      v === "active" ? changeStatus.mutate("active") : setPendingStatus(v as AccountStatus)
                    }
                  >
                    <SelectTrigger className="w-48 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACCOUNT_STATUS_LABELS) as AccountStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ACCOUNT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="pt-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">الأمان</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">إعادة تعيين كلمة المرور</p>
                    <p className="text-xs text-muted-foreground">
                      يتم إنشاء كلمة مرور مؤقتة وإنهاء الجلسات الحالية. لا يمكن للمشرف رؤية كلمة المرور الحالية.
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-full" onClick={() => doReset.mutate()}>
                    إعادة التعيين
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">إجبار تغيير كلمة المرور عند الدخول القادم</p>
                    <p className="text-xs text-muted-foreground">
                      الحالة الحالية: {profile.force_password_change ? "مفعّل" : "غير مفعّل"}
                    </p>
                  </div>
                  <Switch
                    checked={profile.force_password_change}
                    onCheckedChange={(v) => toggleForce.mutate(v)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">تسجيل الخروج من جميع الأجهزة</p>
                    <p className="text-xs text-muted-foreground">إنهاء كل الجلسات النشطة لهذا المستخدم.</p>
                  </div>
                  <Button variant="outline" className="rounded-full" onClick={() => doSignOutAll.mutate()}>
                    إنهاء الجلسات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4 pt-4">
            {seller && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="عدد الطلبات" value={nf(seller.orders_count)} />
                <StatCard label="الطلبات المؤكدة" value={nf(seller.confirmed_count)} />
                <StatCard label="إجمالي المبيعات" value={nf(seller.total_amount)} />
                <StatCard label="الرصيد" value={nf(seller.balance)} />
              </div>
            )}
            {callCenter && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="عدد الطلبات" value={nf(callCenter.orders_count)} />
                <StatCard label="الطلبات المؤكدة" value={nf(callCenter.confirmed_count)} />
                <StatCard label="عدد المكالمات" value={nf(callCenter.calls_count)} />
                <StatCard label="التقييم" value={nf(callCenter.score)} />
              </div>
            )}
            {!seller && !callCenter && (
              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  لا توجد إحصائيات تشغيلية لهذا النوع من الحسابات؛ يمكن متابعة نشاطه الإداري من تبويب النشاط.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <Card className="rounded-xl shadow-sm">
              <CardContent className="divide-y p-5">
                {activity.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد نشاط مسجل.</p>}
                {activity.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{actionLabel(row.action)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.actor_name || row.actor_email || "—"}
                        {row.acting_for_id && row.acting_for_id !== row.actor_id
                          ? ` — نيابة عن ${row.target_name || row.target_email || ""}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === "suspended" ? "تأكيد حظر المستخدم" : "تأكيد تعطيل الحساب"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم منع المستخدم من تسجيل الدخول وإنهاء جلساته النشطة، وسيتم تسجيل العملية في سجل النشاطات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatus) changeStatus.mutate(pendingStatus);
                setPendingStatus(null);
              }}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
