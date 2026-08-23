import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Section, StatCard } from "@/components/admin/StatCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { nf } from "@/lib/format";

const description = "لوحة تحكم الكول سنتر في Kassebni_Call2Sell: الطلبات، المكالمات ونسبة التأكيد.";

export const Route = createFileRoute("/_authenticated/callcenter/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم الكول سنتر | Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "لوحة تحكم الكول سنتر | Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CallCenterDashboardRoute,
});

export type CallCenterDashboardData = {
  call_center: { id: string; name: string; code: string; status: string; score: number } | null;
  stats: {
    total_orders: number;
    confirmed: number;
    rejected: number;
    in_progress: number;
    confirm_rate: number;
    calls_count: number;
    avg_call_seconds: number;
  };
  recent_orders: { id: string; status: string; amount: number; handled: boolean; created_at: string }[];
};

export function CallCenterDashboardView({ callCenterId }: { callCenterId: string | null }) {
  const query = useQuery({
    queryKey: ["callcenter-dashboard", callCenterId],
    enabled: Boolean(callCenterId),
    queryFn: async (): Promise<CallCenterDashboardData> => {
      const { data, error } = await supabase.rpc("callcenter_dashboard", { _cc_id: callCenterId! });
      if (error) throw new Error(error.message);
      return data as unknown as CallCenterDashboardData;
    },
  });

  if (!callCenterId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          لا يوجد مركز اتصال مرتبط بهذا الحساب.
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          تعذر تحميل بيانات لوحة التحكم.
        </CardContent>
      </Card>
    );
  }

  const d = query.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{d.call_center?.name ?? "لوحة تحكم الكول سنتر"}</h1>
      <Section title="ملخص الأداء">
        <StatCard label="إجمالي الطلبات" value={nf(d.stats.total_orders)} unit="طلب" />
        <StatCard label="طلبات مؤكدة" value={nf(d.stats.confirmed)} unit="طلب" />
        <StatCard label="طلبات مرفوضة" value={nf(d.stats.rejected)} unit="طلب" />
        <StatCard label="قيد التنفيذ" value={nf(d.stats.in_progress)} unit="طلب" />
        <StatCard label="نسبة التأكيد" value={nf(d.stats.confirm_rate)} unit="%" />
        <StatCard label="عدد المكالمات" value={nf(d.stats.calls_count)} unit="مكالمة" />
        <StatCard label="متوسط مدة المكالمة" value={nf(d.stats.avg_call_seconds)} unit="ثانية" />
      </Section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">أحدث الطلبات</h2>
        <Card>
          <CardContent className="divide-y p-0">
            {d.recent_orders.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
            ) : (
              d.recent_orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8)}</span>
                  <span>{order.status}</span>
                  <span className="tabular-nums">{nf(order.amount)} ج.م</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CallCenterDashboardRoute() {
  return (
    <PortalShell portal="callcenter">
      {({ callCenterId }) => <CallCenterDashboardView callCenterId={callCenterId} />}
    </PortalShell>
  );
}
