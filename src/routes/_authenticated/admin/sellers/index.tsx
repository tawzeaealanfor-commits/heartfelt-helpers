import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { DataFilters } from "@/components/admin/DataFilters";
import { PortalLinkBar } from "@/components/admin/PortalLinkBar";
import { Section, StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSellersOverview, type SellerItem } from "@/lib/sellers";
import { applyFilters, type FilterColumn, type FilterRow } from "@/lib/filters";
import { nf, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/sellers/")({
  head: () => ({
    meta: [
      { title: "Sellers | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "إدارة ومتابعة جميع حسابات Sellers على المنصة: الطلبات، نسبة التأكيد، الرصيد والـScore.",
      },
      { property: "og:title", content: "Sellers | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "إدارة ومتابعة جميع حسابات Sellers على المنصة: الطلبات، نسبة التأكيد، الرصيد والـScore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellersPage,
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

const FILTER_COLUMNS: FilterColumn[] = [
  { key: "name", label: "اسم المتجر", type: "text" },
  { key: "category", label: "الفئة", type: "enum" },
  { key: "status", label: "الحالة", type: "enum", format: (v) => statusLabel(v) },
  { key: "orders_count", label: "عدد الطلبات", type: "number" },
  { key: "confirmed_count", label: "الطلبات المؤكدة", type: "number" },
  { key: "confirm_rate", label: "نسبة التأكيد", type: "number" },
  { key: "balance", label: "الرصيد", type: "number" },
  { key: "score", label: "الاسكور", type: "number" },
];

function SellersPage() {
  const query = useQuery({ queryKey: ["sellers-overview"], queryFn: fetchSellersOverview });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? items.filter(
          (i) => i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term),
        )
      : items;
    return applyFilters(
      bySearch as unknown as Record<string, unknown>[],
      filters,
      FILTER_COLUMNS,
    ) as unknown as SellerItem[];
  }, [items, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize)));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = query.data?.stats;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Sellers</h1>
          <p className="text-sm text-muted-foreground">
            إدارة ومتابعة جميع حسابات Sellers على المنصة
          </p>
          <PortalLinkBar label="رابط تسجيل البائعين" path="/seller/login" />
        </div>

        <DataFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="ابحث باسم المتجر أو معرف الحساب"
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
          </div>
        ) : !stats ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {query.error instanceof Error && query.error.message.includes("FORBIDDEN")
                ? "هذه الصفحة مخصصة للإدارة فقط."
                : query.error instanceof Error
                  ? `تعذر تحميل البيانات: ${query.error.message}`
                  : "لم يتم العثور على البيانات."}
            </CardContent>
          </Card>
        ) : (
          <>
            <Section title="إحصائيات Sellers">
              <StatCard label="إجمالي Sellers" value={nf(stats.total)} />
              <StatCard label="Sellers نشطون" value={nf(stats.active)} />
              <StatCard label="Sellers غير نشطين" value={nf(stats.inactive)} />
              <StatCard label="إجمالي الطلبات" value={nf(stats.total_orders)} unit="طلب" />
            </Section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">جميع السيلر</h2>

              {visible.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    لا توجد نتائج مطابقة
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {visible.map((item) => (
                    <SellerCard key={item.id} item={item} />
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

function StatusBadge({ status }: { status: SellerItem["status"] }) {
  const cls =
    status === "active"
      ? "bg-success/15 text-success"
      : status === "review"
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
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

function SellerCard({ item }: { item: SellerItem }) {
  const navigate = useNavigate();
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{item.name}</p>
            <p className="truncate text-xs text-muted-foreground">{item.category}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Cell label="عدد الطلبات" value={nf(item.orders_count)} />
          <Cell label="الطلبات المؤكدة" value={nf(item.confirmed_count)} />
          <Cell label="نسبة التأكيد" value={`${nf(item.confirm_rate)}%`} />
        </div>

        <div className="grid grid-cols-3 items-center gap-2">
          <Cell label="الرصيد" value={nf(item.balance)} />
          <Cell label="الاسكور" value={nf(item.score)} />
          <Button
            size="sm"
            className="h-full rounded-md"
            onClick={() => navigate({ to: "/admin/sellers/$id", params: { id: item.id } })}
          >
            فتح
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
