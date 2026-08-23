import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { DataFilters } from "@/components/admin/DataFilters";
import { PortalLinkBar } from "@/components/admin/PortalLinkBar";
import { Section, StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCallCentersOverview,
  type CallCenterItem,
} from "@/lib/call-centers.functions";
import { applyFilters, type FilterColumn, type FilterRow } from "@/lib/filters";
import { nf, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/call-centers/")({
  head: () => ({
    meta: [
      { title: "الكول سنتر | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "إدارة ومتابعة جميع أفراد الكول سنتر على منصة Kassebni_Call2Sell: الأداء، الطلبات، الشكاوى والتقييم.",
      },
      { property: "og:title", content: "الكول سنتر | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "إدارة ومتابعة جميع أفراد الكول سنتر على منصة Kassebni_Call2Sell: الأداء، الطلبات، الشكاوى والتقييم.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CallCentersPage,
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

const FILTER_COLUMNS: FilterColumn[] = [
  { key: "name", label: "اسم الفرد", type: "text" },
  { key: "code", label: "رقم الحساب", type: "text" },
  { key: "status", label: "الحالة", type: "enum", format: (v) => statusLabel(v) },
  { key: "orders_received", label: "الطلبات المستلمة", type: "number" },
  { key: "confirm_rate", label: "نسبة التأكيد", type: "number" },
  { key: "score", label: "الـScore", type: "number" },
  { key: "avg_response_minutes", label: "متوسط سرعة الاستجابة", type: "number" },
  { key: "avg_finish_minutes", label: "متوسط وقت إنهاء الطلب", type: "number" },
  { key: "avg_call_seconds", label: "متوسط وقت المكالمة", type: "number" },
  { key: "avg_idle_minutes", label: "متوسط هدر الوقت", type: "number" },
  { key: "total_complaints", label: "إجمالي الشكاوى", type: "number" },
];

function CallCentersPage() {
  const fetchOverview = useServerFn(getCallCentersOverview);
  const query = useQuery({ queryKey: ["call-centers-overview"], queryFn: () => fetchOverview() });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? items.filter(
          (i) => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term),
        )
      : items;
    return applyFilters(bySearch as unknown as Record<string, unknown>[], filters, FILTER_COLUMNS) as unknown as CallCenterItem[];
  }, [items, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize)));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = query.data?.stats;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">الكول سنتر</h1>
          <p className="text-sm text-muted-foreground">
            إدارة ومتابعة جميع أفراد الكول سنتر على المنصة
          </p>
          <PortalLinkBar label="رابط تسجيل الكول سنتر" path="/callcenter/login" />
        </div>

        <DataFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="ابحث باسم فرد الكول سنتر أو معرف الحساب"
          columns={FILTER_COLUMNS}
          rows={items as unknown as Record<string, unknown>[]}
          filters={filters}
          onFiltersChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
        />

        {query.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : !stats ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              لم يتم العثور على البيانات.
            </CardContent>
          </Card>
        ) : (
          <>
            <Section title="إحصائيات الكول سنتر">
              <StatCard label="إجمالي أفراد الكول سنتر" value={nf(stats.total)} />
              <StatCard label="أفراد الكول سنتر النشطون" value={nf(stats.active)} />
              <StatCard label="نسبة الكول سنتر النشط" value={nf(stats.active_rate)} unit="%" />
              <StatCard label="إجمالي الطلبات المستلمة" value={nf(stats.total_orders)} unit="طلب" />
              <StatCard label="نسبة تأكيد الطلبات" value={nf(stats.confirm_rate)} unit="%" />
              <StatCard label="متوسط سرعة الاستجابة" value={nf(stats.avg_response_minutes)} unit="دقيقة" />
              <StatCard label="متوسط وقت إنهاء الطلب" value={nf(stats.avg_finish_minutes)} unit="دقيقة" />
              <StatCard label="متوسط وقت المكالمة" value={nf(stats.avg_call_seconds)} unit="ثانية" />
              <StatCard label="متوسط هدر الوقت" value={nf(stats.avg_idle_minutes)} unit="دقيقة" />
              <StatCard label="متوسط الـScore" value={nf(stats.avg_score)} />
              <StatCard label="إجمالي الشكاوى ضد الكول سنتر" value={nf(stats.total_complaints)} />
              <StatCard label="الشكاوى المفتوحة ضد الكول سنتر" value={nf(stats.open_complaints)} />
            </Section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">جميع الكول سنتر</h2>

              {visible.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    لا توجد نتائج مطابقة
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {visible.map((item) => (
                    <CallCenterCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">عدد الكروت في الصفحة</span>
                  <Input
                    type="number"
                    min={1}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Math.max(1, Number(e.target.value) || 1));
                      setPage(1);
                    }}
                    className="h-9 w-20 rounded-full bg-card text-center tabular-nums"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-card"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-card"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: CallCenterItem["status"] }) {
  const cls =
    status === "active"
      ? "bg-success/15 text-success"
      : status === "disabled"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{statusLabel(status)}</span>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 p-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CallCenterCard({ item }: { item: CallCenterItem }) {
  const navigate = useNavigate();
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{item.name}</p>
            <p className="text-xs tabular-nums text-muted-foreground">{item.code}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Cell label="الطلبات المستلمة" value={nf(item.orders_received)} />
          <Cell label="نسبة التأكيد" value={`${nf(item.confirm_rate)}%`} />
          <Cell label="الـScore" value={nf(item.score)} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Cell label="متوسط سرعة الاستجابة" value={`${nf(item.avg_response_minutes)} د`} />
          <Cell label="متوسط وقت إنهاء الطلب" value={`${nf(item.avg_finish_minutes)} د`} />
          <Cell label="متوسط وقت المكالمة" value={`${nf(item.avg_call_seconds)} ث`} />
        </div>

        <div className="grid grid-cols-3 items-center gap-2">
          <Cell label="متوسط هدر الوقت" value={`${nf(item.avg_idle_minutes)} د`} />
          <Cell label="إجمالي الشكاوى" value={nf(item.total_complaints)} />
          <Button
            size="sm"
            className="h-full rounded-md"
            onClick={() =>
              navigate({ to: "/admin/call-centers/$id", params: { id: item.id } })
            }
          >
            فتح
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
