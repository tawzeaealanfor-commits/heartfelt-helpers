import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCallCentersOverview } from "@/lib/call-centers";
import { nf, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/call-centers/$id")({
  head: () => ({
    meta: [
      { title: "صفحة فرد الكول سنتر | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "مراجعة تفاصيل أداء فرد الكول سنتر: الطلبات، نسبة التأكيد، أوقات الاستجابة والشكاوى.",
      },
      { property: "og:title", content: "صفحة فرد الكول سنتر | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "مراجعة تفاصيل أداء فرد الكول سنتر: الطلبات، نسبة التأكيد، أوقات الاستجابة والشكاوى.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CallCenterDetail,
  errorComponent: ({ error }) => (
    <AdminShell>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6 text-center text-sm text-muted-foreground" role="alert">
          {error.message === "FORBIDDEN" ? "هذه الصفحة مخصصة للإدارة فقط." : "تعذر تحميل البيانات."}
        </CardContent>
      </Card>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          لم يتم العثور على البيانات.
        </CardContent>
      </Card>
    </AdminShell>
  ),
});

function CallCenterDetail() {
  const { id } = Route.useParams();
  const query = useQuery({ queryKey: ["call-centers-overview"], queryFn: fetchCallCentersOverview });

  const item = query.data?.items.find((i) => i.id === id);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        {query.isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !item ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              لم يتم العثور على البيانات.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <p className="text-sm tabular-nums text-muted-foreground">
                {item.code} — {statusLabel(item.status)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <StatCard label="الطلبات المستلمة" value={nf(item.orders_received)} unit="طلب" />
              <StatCard label="نسبة التأكيد" value={nf(item.confirm_rate)} unit="%" />
              <StatCard label="الـScore" value={nf(item.score)} />
              <StatCard label="متوسط سرعة الاستجابة" value={nf(item.avg_response_minutes)} unit="دقيقة" />
              <StatCard label="متوسط وقت إنهاء الطلب" value={nf(item.avg_finish_minutes)} unit="دقيقة" />
              <StatCard label="متوسط وقت المكالمة" value={nf(item.avg_call_seconds)} unit="ثانية" />
              <StatCard label="متوسط هدر الوقت" value={nf(item.avg_idle_minutes)} unit="دقيقة" />
              <StatCard label="إجمالي الشكاوى" value={nf(item.total_complaints)} />
              <StatCard label="الشكاوى المفتوحة" value={nf(item.open_complaints)} />
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
