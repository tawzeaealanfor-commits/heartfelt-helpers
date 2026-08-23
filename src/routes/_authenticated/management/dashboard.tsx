import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PortalShell } from "@/components/portal/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_TYPE_LABELS } from "@/lib/access";

const description = "لوحة تحكم فريق الإدارة في Kassebni_Call2Sell: بيانات الحساب والصلاحيات المتاحة.";

export const Route = createFileRoute("/_authenticated/management/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم الإدارة | Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "لوحة تحكم الإدارة | Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagementDashboardRoute,
});

function ManagementDashboardView() {
  const account = useAccount();
  const role = account.data?.accountType ?? "employee";

  const permissions = useQuery({
    queryKey: ["role-permissions", role],
    enabled: Boolean(account.data),
    queryFn: async () => {
      const [{ data: rp }, { data: perms }] = await Promise.all([
        supabase.from("role_permissions").select("permission").eq("role", role),
        supabase.from("permissions").select("key, label, category"),
      ]);
      const allowed = new Set((rp ?? []).map((r) => r.permission));
      return (perms ?? []).filter((p) => allowed.has(p.key));
    },
  });

  if (account.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">لوحة تحكم الإدارة</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="الاسم" value={account.data?.fullName ?? "—"} />
          <Field label="البريد الإلكتروني" value={account.data?.email ?? "—"} />
          <Field label="رقم الهاتف" value={account.data?.phone ?? "—"} />
          <Field label="نوع الحساب" value={ACCOUNT_TYPE_LABELS[role]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">صلاحياتك</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {permissions.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (permissions.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">لم يتم منح صلاحيات لهذا الدور بعد.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(permissions.data ?? []).map((p) => (
                <li key={p.key} className="rounded-md bg-muted/60 px-3 py-2">
                  {p.label}
                  <span className="block text-xs text-muted-foreground">{p.category}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ManagementDashboardRoute() {
  return <PortalShell portal="staff">{() => <ManagementDashboardView />}</PortalShell>;
}
