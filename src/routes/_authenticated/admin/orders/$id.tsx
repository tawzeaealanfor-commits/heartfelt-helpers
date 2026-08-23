import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { nf } from "@/lib/format";
import {
  addOrderComment,
  fetchMyOrderRating,
  fetchOrderComments,
  markOrderCommentsRead,
  setOrderRating,
} from "@/lib/comments";
import {
  callStatusLabel,
  fetchOrderDetail,
  formatDateTime,
  orderStatusLabel,
  ORDER_STATUS_TONE,
} from "@/lib/orders";


export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الطلب | لوحة تحكم Kassebni_Call2Sell" },
      {
        name: "description",
        content: "تفاصيل الطلب الكاملة: الخط الزمني، محاولات الاتصال، تعليقات وتسجيلات المكالمات والـScreenshots.",
      },
      { property: "og:title", content: "تفاصيل الطلب | لوحة تحكم Kassebni_Call2Sell" },
      {
        property: "og:description",
        content: "تفاصيل الطلب الكاملة: الخط الزمني، محاولات الاتصال، تعليقات وتسجيلات المكالمات والـScreenshots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderDetailPage,
  errorComponent: ({ error }) => (
    <AdminShell>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6 text-center text-sm text-muted-foreground" role="alert">
          {error.message.includes("FORBIDDEN")
            ? "هذه الصفحة مخصصة للإدارة فقط."
            : "تعذر تحميل بيانات الطلب."}
        </CardContent>
      </Card>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          لم يتم العثور على الطلب.
        </CardContent>
      </Card>
    </AdminShell>
  ),
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["order-detail", id], queryFn: () => fetchOrderDetail(id) });
  const commentsQuery = useQuery({
    queryKey: ["order-comments", id],
    queryFn: () => fetchOrderComments(id),
  });
  const myRatingQuery = useQuery({
    queryKey: ["order-my-rating", id],
    queryFn: () => fetchMyOrderRating(id),
  });

  const [body, setBody] = useState("");
  const [ratingValue, setRatingValue] = useState("");
  const [sending, setSending] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (myRatingQuery.data != null) setRatingValue(String(myRatingQuery.data));
  }, [myRatingQuery.data]);

  // فتح صفحة التفاصيل هو ما يعتبر التعليقات مقروءة
  useEffect(() => {
    void markOrderCommentsRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["orders-unread-comments"] }))
      .catch(() => undefined);
  }, [id, queryClient]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await addOrderComment(id, trimmed);
      setBody("");
      await commentsQuery.refetch();
      await markOrderCommentsRead(id);
      await queryClient.invalidateQueries({ queryKey: ["orders-unread-comments"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة التعليق");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveRating() {
    const parsed = Number(ratingValue);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
      setError("التقييم يجب أن يكون بين 1 و 10");
      return;
    }
    setSavingRating(true);
    setError(null);
    try {
      await setOrderRating(id, Math.round(parsed));
      await myRatingQuery.refetch();
      await commentsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ التقييم");
    } finally {
      setSavingRating(false);
    }
  }


  const order = query.data?.order;
  const calls = query.data?.calls ?? [];
  const complaints = query.data?.complaints ?? [];

  const timeline = order
    ? [
        { label: "تم رفع الطلب", at: order.created_at },
        ...(order.first_attempt_at ? [{ label: "أول محاولة اتصال", at: order.first_attempt_at }] : []),
        ...calls.map((c) => ({
          label: `محاولة اتصال${c.call_center_name ? ` — ${c.call_center_name}` : ""}`,
          at: c.started_at,
        })),
        ...(order.closed_at ? [{ label: "إغلاق الطلب", at: order.closed_at }] : []),
      ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    : [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/admin/orders">
              <ArrowRight className="size-4" />
              الطلبات
            </Link>
          </Button>
        </div>

        {query.isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !order ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              لم يتم العثور على الطلب.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-bold tabular-nums">طلب #{order.order_no}</h1>
                    <p className="text-sm text-muted-foreground">{order.seller_name ?? "بدون Seller"}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      ORDER_STATUS_TONE[order.status] ?? "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {orderStatusLabel(order.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  <Row label="اسم العميل" value={order.customer_name} />
                  <Row label="اسم المنتج" value={order.product_name} />
                  <Row label="قيمة الطلب" value={`${nf(order.amount)} ج.م`} />
                  <Row label="الكول سنتر المسؤول" value={order.call_center_name ?? "غير معيّن"} />
                  <Row label="تاريخ ووقت رفع الطلب" value={formatDateTime(order.created_at)} />
                  <Row label="حالة المكالمة" value={callStatusLabel(order.call_status)} />
                  <Row label="عدد المحاولات" value={nf(order.attempts_count)} />
                  <Row label="تم التعامل معه" value={order.handled ? "نعم" : "لا"} />
                  <Row
                    label="زمن الاستجابة المستهدف"
                    value={`${nf(order.target_response_minutes)} دقيقة`}
                  />
                </div>
              </CardContent>
            </Card>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">الخط الزمني</h2>
              <Card className="rounded-xl shadow-sm">
                <CardContent className="space-y-3 p-5">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد أحداث.</p>
                  ) : (
                    timeline.map((event, i) => (
                      <div key={`${event.label}-${i}`} className="flex items-start gap-3">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium">{event.label}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">محاولات الاتصال</h2>
              {calls.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    لا توجد محاولات اتصال.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {calls.map((call, index) => (
                    <Card key={call.id} className="rounded-xl shadow-sm">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <p className="font-medium">المحاولة رقم {index + 1}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(call.started_at)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                          <Row label="الكول سنتر" value={call.call_center_name ?? "غير معيّن"} />
                          <Row label="نتيجة المحاولة" value={call.outcome ?? "—"} />
                          <Row
                            label="مدة المكالمة"
                            value={
                              call.ended_at
                                ? `${nf(
                                    (new Date(call.ended_at).getTime() -
                                      new Date(call.started_at).getTime()) /
                                      1000,
                                  )} ثانية`
                                : "—"
                            }
                          />
                        </div>
                        {call.note ? (
                          <p className="rounded-md bg-muted/50 p-3 text-xs">{call.note}</p>
                        ) : null}
                        {call.recording_url ? (
                          <audio controls src={call.recording_url} className="w-full" />
                        ) : null}
                        {call.screenshot_url ? (
                          <img
                            src={call.screenshot_url}
                            alt={`Screenshot لمحاولة الاتصال رقم ${index + 1} بالطلب ${order.order_no}`}
                            loading="lazy"
                            className="w-full rounded-md"
                          />
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">التقييم</h2>
              <Card className="rounded-xl shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <label htmlFor="my-rating" className="text-sm font-medium">
                    تقييمك للطلب من 1 إلى 10
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="my-rating"
                      type="number"
                      min={1}
                      max={10}
                      value={ratingValue}
                      onChange={(e) => setRatingValue(e.target.value)}
                      placeholder="مثال: 8"
                      disabled={savingRating}
                      className="tabular-nums"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 rounded-full"
                      disabled={savingRating || ratingValue.trim() === ""}
                      onClick={handleSaveRating}
                    >
                      {savingRating ? "جارٍ الحفظ..." : "حفظ التقييم"}
                    </Button>
                  </div>
                  {ratingError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {ratingError}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">التعليقات</h2>
              <Card className="rounded-xl shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <form onSubmit={handleAddComment} className="space-y-3">
                    <label htmlFor="new-comment" className="text-sm font-medium">
                      أضف تعليقًا (يمكنك إضافة أكثر من تعليق)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-comment"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="اكتب تعليقك هنا"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="shrink-0 rounded-full"
                        disabled={sending || !body.trim()}
                      >
                        {sending ? "جارٍ الإرسال..." : "إرسال"}
                      </Button>
                    </div>
                  </form>

                  {error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}



                  <div className="space-y-2 border-t pt-4">
                    {commentsQuery.isLoading ? (
                      <Skeleton className="h-16 w-full rounded-md" />
                    ) : (commentsQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد تعليقات بعد.</p>
                    ) : (
                      (commentsQuery.data ?? []).map((c) => (
                        <div key={c.id} className="rounded-md bg-muted/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium">{c.author_name}</p>
                            <div className="flex items-center gap-2">
                              {c.rating != null ? (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                                  {nf(c.rating)}/10
                                </span>
                              ) : null}
                              <span className="text-[11px] text-muted-foreground">
                                {formatDateTime(c.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 text-sm">{c.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>


            {complaints.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-base font-semibold">الشكاوى المرتبطة</h2>
                <div className="space-y-2">
                  {complaints.map((c) => (
                    <Card key={c.id} className="rounded-xl shadow-sm">
                      <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
                        <span>{c.subject}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
