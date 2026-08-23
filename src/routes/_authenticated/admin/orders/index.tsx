import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCheck, Image as ImageIcon, MessageSquare, PlayCircle, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { DataFilters } from "@/components/admin/DataFilters";
import { Section, StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { applyFilters, type FilterColumn, type FilterRow } from "@/lib/filters";
import { nf } from "@/lib/format";
import {
  addOrderComment,
  fetchMyOrderRating,
  fetchUnreadComments,
  markAllOrderCommentsRead,
  setOrderRating,
} from "@/lib/comments";
import {
  callStatusLabel,
  fetchOrderDetail,
  fetchOrdersOverview,
  formatDateTime,
  orderStatusLabel,
  ORDER_STATUS_TONE,
  type OrderItem,
} from "@/lib/orders";


export const Route = createFileRoute("/_authenticated/admin/orders/")({
  head: () => ({
    meta: [
      { title: "الطلبات | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "إدارة ومتابعة جميع الطلبات على المنصة: الحالة، الكول سنتر، تسجيلات المكالمات والـScreenshots.",
      },
      { property: "og:title", content: "الطلبات | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "إدارة ومتابعة جميع الطلبات على المنصة: الحالة، الكول سنتر، تسجيلات المكالمات والـScreenshots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
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
  { key: "order_no", label: "رقم الطلب", type: "number" },
  { key: "seller_name", label: "اسم Seller", type: "enum" },
  { key: "status", label: "حالة الطلب", type: "enum", format: (v) => orderStatusLabel(v) },
  { key: "customer_name", label: "اسم العميل", type: "enum" },
  { key: "product_name", label: "اسم المنتج", type: "enum" },
  { key: "amount", label: "قيمة الطلب", type: "number" },
  { key: "call_center_name", label: "الكول سنتر المسؤول", type: "enum" },
  { key: "call_status", label: "حالة المكالمة", type: "enum", format: (v) => callStatusLabel(v) },
];

function OrdersPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["orders-overview"], queryFn: fetchOrdersOverview });
  const unreadQuery = useQuery({
    queryKey: ["orders-unread-comments"],
    queryFn: fetchUnreadComments,
  });
  const unread = unreadQuery.data ?? {};
  const totalUnread = Object.values(unread).reduce((a, b) => a + Number(b), 0);
  const [markingRead, setMarkingRead] = useState(false);

  async function handleMarkAllRead() {
    setMarkingRead(true);
    try {
      await markAllOrderCommentsRead();
      await queryClient.invalidateQueries({ queryKey: ["orders-unread-comments"] });
    } finally {
      setMarkingRead(false);
    }
  }


  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? items.filter(
          (i) =>
            String(i.order_no).includes(term) ||
            i.customer_name.toLowerCase().includes(term) ||
            (i.seller_name ?? "").toLowerCase().includes(term),
        )
      : items;
    return applyFilters(
      bySearch as unknown as Record<string, unknown>[],
      filters,
      FILTER_COLUMNS,
    ) as unknown as OrderItem[];
  }, [items, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize)));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = query.data?.stats;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <p className="text-sm text-muted-foreground">إدارة ومتابعة جميع الطلبات على المنصة</p>
        </div>

        <DataFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="ابحث برقم الطلب أو اسم العميل أو اسم Seller"
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
            <Section title="إحصائيات الطلبات">
              <StatCard label="إجمالي الطلبات" value={nf(stats.total)} unit="طلب" />
              <StatCard label="الطلبات الجديدة" value={nf(stats.new)} unit="طلب" />
              <StatCard label="الطلبات قيد التنفيذ" value={nf(stats.in_progress)} unit="طلب" />
              <StatCard label="الطلبات المؤكدة" value={nf(stats.confirmed)} unit="طلب" />
              <StatCard label="الطلبات المرفوضة" value={nf(stats.rejected)} unit="طلب" />
              <StatCard label="الطلبات المتأخرة" value={nf(stats.late)} unit="طلب" />
            </Section>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3">
              <p className="text-sm text-muted-foreground">
                {totalUnread > 0
                  ? `لديك ${nf(totalUnread)} تعليق غير مقروء على الطلبات`
                  : "لا توجد تعليقات غير مقروءة"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 rounded-full"
                disabled={markingRead || totalUnread === 0}
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="size-4" />
                اعتبار التعليقات مقروءة
              </Button>
            </div>


            <section className="space-y-3">
              <h2 className="text-base font-semibold">جميع الطلبات</h2>

              {visible.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    لا توجد نتائج مطابقة
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {visible.map((item) => (
                    <OrderCard key={item.id} item={item} unreadCount={Number(unread[item.id] ?? 0)} />
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

function OrderCard({ item, unreadCount }: { item: OrderItem; unreadCount: number }) {
  const queryClient = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [ratingValue, setRatingValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [complaintNotice, setComplaintNotice] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingNotice, setRatingNotice] = useState<string | null>(null);

  const myRating = useQuery({
    queryKey: ["order-my-rating", item.id],
    queryFn: () => fetchMyOrderRating(item.id),
    enabled: ratingOpen,
  });

  useEffect(() => {
    if (ratingOpen && myRating.data != null) setRatingValue(String(myRating.data));
  }, [ratingOpen, myRating.data]);

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = subject.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setComplaintError(null);
    setComplaintNotice(null);
    try {
      await addOrderComment(item.id, trimmed);
      setSubject("");
      setComplaintNotice("تم إضافة التعليق");
      await queryClient.invalidateQueries({ queryKey: ["order-comments", item.id] });
    } catch (err) {
      setComplaintError(err instanceof Error ? err.message : "تعذر إرسال التعليق");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRatingSave() {
    const parsed = Number(ratingValue);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
      setRatingError("التقييم يجب أن يكون بين 1 و 10");
      return;
    }
    setSavingRating(true);
    setRatingError(null);
    setRatingNotice(null);
    try {
      await setOrderRating(item.id, Math.round(parsed));
      setRatingNotice("تم حفظ التقييم");
      await queryClient.invalidateQueries({ queryKey: ["order-my-rating", item.id] });
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : "تعذر حفظ التقييم");
    } finally {
      setSavingRating(false);
    }
  }



  const detail = useQuery({
    queryKey: ["order-detail", item.id],
    queryFn: () => fetchOrderDetail(item.id),
    enabled: recordOpen,
  });

  const calls = detail.data?.calls ?? [];
  const recordings = calls.filter((c) => c.recording_url);
  const screenshots = calls.filter((c) => c.screenshot_url);
  const hasRecord = item.recordings_count > 0 || item.screenshots_count > 0;
  const rating = item.call_center_rating;

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums">طلب #{item.order_no}</p>
            <p className="truncate text-xs text-muted-foreground">{item.seller_name ?? "بدون Seller"}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              ORDER_STATUS_TONE[item.status] ?? "bg-muted text-muted-foreground border-border"
            }`}
          >
            {orderStatusLabel(item.status)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-3 text-xs">
          <Field label="اسم العميل" value={item.customer_name} />
          <Field label="اسم المنتج" value={item.product_name} />
          <Field label="قيمة الطلب" value={`${nf(item.amount)} ج.م`} />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-3 text-xs">
          <Field label="الكول سنتر المسؤول" value={item.call_center_name ?? "غير معيّن"} />
          <Field label="حالة المكالمة" value={callStatusLabel(item.call_status)} />
        </div>


        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Record</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 rounded-full bg-card px-3 text-xs"
              onClick={() => setRecordOpen(true)}
              disabled={!hasRecord}
              aria-label="عرض تسجيل المكالمة أو Screenshot محاولة الاتصال"
            >
              {item.recordings_count > 0 ? (
                <PlayCircle className="size-3.5" />
              ) : (
                <ImageIcon className="size-3.5" />
              )}
              {hasRecord ? "عرض" : "غير متوفر"}
            </Button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[11px] text-muted-foreground">تقييم الكول سنتر</span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-semibold tabular-nums text-primary">
              {rating === null ? "—" : `${nf(rating)}/10`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link to="/admin/orders/$id" params={{ id: item.id }}>
              فتح
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 rounded-full"
            onClick={() => setComplaintOpen(true)}
          >
            <MessageSquare className="size-3.5" />
            تعليق
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 rounded-full"
            onClick={() => setRatingOpen(true)}
          >
            <Star className="size-3.5" />
            تقييم
          </Button>
          {unreadCount > 0 ? (
            <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-destructive">
              {nf(unreadCount)} تعليق غير مقروء
            </span>
          ) : null}


        </div>
      </CardContent>

      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent dir="rtl" className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right">Record — طلب #{item.order_no}</DialogTitle>
          </DialogHeader>

          {detail.isLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : (
            <div className="space-y-3">
              {recordings.map((call) => (
                <div key={`rec-${call.id}`} className="space-y-2 rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(call.started_at)}
                    {call.call_center_name ? ` — ${call.call_center_name}` : ""}
                  </p>
                  <audio controls src={call.recording_url ?? undefined} className="w-full" />
                </div>
              ))}
              {screenshots.map((call) => (
                <div key={`shot-${call.id}`} className="space-y-2 rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(call.started_at)} — محاولة اتصال فاشلة
                  </p>
                  <img
                    src={call.screenshot_url ?? ""}
                    alt={`Screenshot لمحاولة الاتصال بالطلب رقم ${item.order_no}`}
                    loading="lazy"
                    className="w-full rounded-md"
                  />
                </div>
              ))}
              {recordings.length === 0 && screenshots.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">لا يوجد تسجيل أو Screenshot.</p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={complaintOpen} onOpenChange={setComplaintOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تعليق على طلب #{item.order_no}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCommentSubmit} className="space-y-3">
            <label htmlFor={`comment-body-${item.id}`} className="text-sm font-medium">
              نص التعليق
            </label>
            <Input
              id={`comment-body-${item.id}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="اكتب تعليقك هنا"
              disabled={submitting}
            />
            {complaintError ? (
              <p className="text-sm text-destructive" role="alert">
                {complaintError}
              </p>
            ) : null}
            {complaintNotice ? (
              <p className="text-sm text-success" role="status">
                {complaintNotice}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="rounded-full"
                disabled={submitting || !subject.trim()}
              >
                {submitting ? "جارٍ الإرسال..." : "إرسال التعليق"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تقييم الطلب #{item.order_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label htmlFor={`order-rating-${item.id}`} className="text-sm font-medium">
              التقييم من 1 إلى 10
            </label>
            <Input
              id={`order-rating-${item.id}`}
              type="number"
              min={1}
              max={10}
              value={ratingValue}
              onChange={(e) => setRatingValue(e.target.value)}
              placeholder="مثال: 8"
              disabled={savingRating}
              className="tabular-nums"
            />
            {ratingError ? (
              <p className="text-sm text-destructive" role="alert">
                {ratingError}
              </p>
            ) : null}
            {ratingNotice ? (
              <p className="text-sm text-success" role="status">
                {ratingNotice}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={savingRating || ratingValue.trim() === ""}
                onClick={handleRatingSave}
              >
                {savingRating ? "جارٍ الحفظ..." : "حفظ التقييم"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

