import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Clock, CreditCard, Eye, Inbox, MessageSquareWarning } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { DateRangeBar } from "@/components/admin/DateRangeBar";
import { PasswordGate } from "@/components/admin/PasswordGate";
import { Section, StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminDashboard, getMyAccount } from "@/lib/dashboard.functions";
import { DEMO_CALL_CENTER_PATH, DEMO_SELLER_PATH } from "@/lib/demo";
import { nf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "الرئيسية | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "لوحة تحكم إدارة منصة Kassebni_Call2Sell: حالة المنصة، الطلبات، البائعون، الكول سنتر والأداء المالي.",
      },
      { property: "og:title", content: "الرئيسية | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "لوحة تحكم إدارة منصة Kassebni_Call2Sell: حالة المنصة، الطلبات، البائعون، الكول سنتر والأداء المالي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminHome,
});

const toInput = (d: Date) => d.toISOString().slice(0, 10);
const hour12 = (h: number) => {
  const suffix = h >= 12 ? "م" : "ص";
  const v = h % 12 === 0 ? 12 : h % 12;
  return `${v}:00 ${suffix}`;
};

function AdminHome() {
  const navigate = useNavigate();
  const account = useQuery({ queryKey: ["account"], queryFn: () => getMyAccount() });

  const defaults = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { from: toInput(from), to: toInput(to) };
  }, []);

  const [range, setRange] = useState(defaults);

  const fetchDashboard = useServerFn(getAdminDashboard);
  const dashboard = useQuery({
    queryKey: ["admin-dashboard", range.from, range.to],
    queryFn: () =>
      fetchDashboard({
        data: {
          from: new Date(`${range.from}T00:00:00`).toISOString(),
          to: new Date(`${range.to}T23:59:59`).toISOString(),
        },
      }),
    enabled: account.data?.isAdmin === true,
  });

  if (account.isLoading) {
    return (
      <AdminShell>
        <Skeleton className="h-40 w-full" />
      </AdminShell>
    );
  }

  if (account.data && !account.data.isAdmin) {
    return (
      <AdminShell>
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            هذه الصفحة مخصصة للإدارة فقط.
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  if (account.data?.profile && account.data.profile.password_set === false) {
    return (
      <AdminShell>
        <PasswordGate onDone={() => account.refetch()} />
      </AdminShell>
    );
  }

  const d = dashboard.data;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">الرئيسية</h1>
          <DateRangeBar range={range} onChange={setRange} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-card px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">معاينة تجريبية:</span>
          <Button asChild size="sm" variant="outline" className="gap-1 rounded-full text-xs">
            <a href={DEMO_SELLER_PATH}>
              <Eye className="size-3.5" />
              بوابة البائع
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1 rounded-full text-xs">
            <a href={DEMO_CALL_CENTER_PATH}>
              <Eye className="size-3.5" />
              بوابة الكول سنتر
            </a>
          </Button>
        </div>


        {dashboard.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : dashboard.isError ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">تعذر تحميل بيانات لوحة التحكم.</p>
              <Button variant="outline" onClick={() => dashboard.refetch()}>
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        ) : !d ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              لا توجد بيانات متاحة لهذه الفترة.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <PlatformStatus status={d.platform_status} />

            <Attention data={d.attention} onGo={() => navigate({ to: "/admin" })} />

            <Section title="أرقام مهمة">
              <StatCard label="إجمالي الطلبات" value={nf(d.key_numbers.total_orders)} unit="طلب" />
              <StatCard label="متوسط الطلبات اليومية" value={nf(d.key_numbers.avg_daily_orders)} unit="طلب/يوم" />
              <StatCard label="نسبة نجاح الطلبات" value={nf(d.key_numbers.success_rate)} unit="%" />
              <StatCard
                label="متوسط وقت أول محاولة اتصال"
                value={nf(d.key_numbers.avg_first_attempt_minutes)}
                unit="دقيقة"
              />
              <StatCard label="متوسط وقت المكالمة" value={nf(d.key_numbers.avg_call_seconds)} unit="ثانية" />
              <StatCard label="متوسط عدد محاولات الاتصال" value={nf(d.key_numbers.avg_attempts)} unit="محاولة" />
              <StatCard label="نسبة تجاوز زمن الاستجابة" value={nf(d.key_numbers.late_response_rate)} unit="%" />
              <StatCard label="إجمالي الحوافز" value={nf(d.key_numbers.total_incentives)} unit="ج.م" />
              <StatCard label="عدد المكالمات التي تمت" value={nf(d.key_numbers.calls_done)} unit="مكالمة" />
            </Section>

            <Section title="Sellers">
              <StatCard label="إجمالي Sellers" value={nf(d.sellers.total)} />
              <StatCard label="Sellers النشطون" value={nf(d.sellers.active)} />
              <StatCard label="نسبة النشطين" value={nf(d.sellers.active_rate)} unit="%" />
              <StatCard label="متوسط الطلبات لكل Seller" value={nf(d.sellers.avg_orders_per_seller)} unit="طلب" />
            </Section>

            <Section title="الكول سنتر">
              <StatCard label="إجمالي الكول سنتر" value={nf(d.call_centers.total)} />
              <StatCard label="الكول سنتر النشطون" value={nf(d.call_centers.active)} />
              <StatCard label="نسبة النشطين" value={nf(d.call_centers.active_rate)} unit="%" />
              <StatCard
                label="متوسط المكالمات لكل كول سنتر يوميًا"
                value={nf(d.call_centers.avg_calls_per_center_daily)}
                unit="مكالمة/يوم"
              />
            </Section>

            <Section title="الأداء المالي">
              <StatCard label="مستحقات Sellers" value={nf(d.finance.seller_dues)} unit="ج.م" />
              <StatCard label="مستحقات الكول سنتر" value={nf(d.finance.callcenter_dues)} unit="ج.م" />
              <StatCard label="رصيد المنصة" value={nf(d.finance.platform_balance)} unit="ج.م" />
              <StatCard label="أرباح المنصة" value={nf(d.finance.platform_profit)} unit="ج.م" />
              <StatCard label="إجمالي الحوافز" value={nf(d.finance.total_incentives)} unit="ج.م" />
            </Section>

            <Section title="أوقات الذروة">
              <StatCard
                label="فترة الذروة المعتادة"
                value={
                  d.peak.start_hour === null
                    ? "لا توجد بيانات كافية"
                    : `${hour12(d.peak.start_hour)} — ${hour12(d.peak.end_hour ?? d.peak.start_hour + 3)}`
                }
              />
              <StatCard label="متوسط الطلبات خلال الذروة" value={nf(d.peak.avg_orders)} unit="طلب/يوم" />
            </Section>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function PlatformStatus({
  status,
}: {
  status: { status: "normal" | "pressure" | "late"; reason: string };
}) {
  const map = {
    normal: { label: "طبيعي", cls: "bg-success/15 text-success" },
    pressure: { label: "ضغط", cls: "bg-warning/15 text-warning" },
    late: { label: "طلبات متأخرة", cls: "bg-destructive/15 text-destructive" },
  } as const;
  const s = map[status.status] ?? map.normal;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">حالة المنصة</h2>
      <div className={`rounded-xl p-5 ${s.cls}`}>
        <p className="text-lg font-semibold">{s.label}</p>
        <p className="mt-1 text-sm opacity-90">{status.reason}</p>
      </div>
    </section>
  );
}

function Attention({
  data,
  onGo,
}: {
  data: {
    late_orders: number;
    unhandled_orders: number;
    pending_withdrawals: number;
    pending_deposits: number;
    open_complaints: number;
  };
  onGo: () => void;
}) {
  const items = [
    { label: "الطلبات المتأخرة", value: data.late_orders, icon: Clock },
    { label: "طلبات لم يتم التعامل معها", value: data.unhandled_orders, icon: Inbox },
    { label: "سحوبات معلقة", value: data.pending_withdrawals, icon: CreditCard },
    { label: "إيداعات معلقة", value: data.pending_deposits, icon: CreditCard },
    { label: "شكاوى مفتوحة", value: data.open_complaints, icon: MessageSquareWarning },
  ];
  const active = items.filter((i) => i.value > 0);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <AlertTriangle className="size-4 text-warning" />
        يحتاج انتباهك
      </h2>
      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          لا يوجد ما يحتاج تدخلًا حاليًا.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {active.map((item) => (
            <button
              key={item.label}
              onClick={onGo}
              className="flex items-center justify-between rounded-xl bg-warning/15 p-4 text-right transition-colors hover:bg-warning/25"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-warning">
                <item.icon className="size-4" />
                {item.label}
              </span>
              <span className="text-xl font-bold tabular-nums text-warning">{nf(item.value)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
