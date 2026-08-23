import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSellersOverview } from "@/lib/sellers.functions";
import { nf, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/sellers/$id")({
  head: () => ({
    meta: [
      { title: "صفحة السيلر | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "مراجعة تفاصيل حساب السيلر: الطلبات، الطلبات المؤكدة، نسبة التأكيد، الرصيد والاسكور.",
      },
      { property: "og:title", content: "صفحة السيلر | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "مراجعة تفاصيل حساب السيلر: الطلبات، الطلبات المؤكدة، نسبة التأكيد، الرصيد والاسكور.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellerDetail,
  errorComponent: ({ error }) => (
    <AdminShell>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6 text-center text-sm text-muted-foreground" role="alert">
          {error.message.includes("FORBIDDEN")
            ? "هذه الصفحة مخصصة للإدارة فقط."
            : "تعذر تحميل البيانات."}
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

function SellerDetail() {
  const { id } = Route.useParams();
  const fetchOverview = useServerFn(getSellersOverview);
  const query = useQuery({ queryKey: ["sellers-overview"], queryFn: () => fetchOverview() });

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
              <p className="text-sm text-muted-foreground">
                {item.category} — {statusLabel(item.status)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <StatCard label="عدد الطلبات" value={nf(item.orders_count)} unit="طلب" />
              <StatCard label="الطلبات المؤكدة" value={nf(item.confirmed_count)} unit="طلب" />
              <StatCard label="نسبة التأكيد" value={nf(item.confirm_rate)} unit="%" />
              <StatCard label="الرصيد" value={nf(item.balance)} />
              <StatCard label="الاسكور" value={nf(item.score)} />
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
