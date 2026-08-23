import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { actionLabel, fetchAdminActivity, formatDateTime } from "@/lib/admin-users";

const description = "سجل نشاطات منصة Kassebni_Call2Sell: عمليات المشرفين والمستخدمين مع التاريخ والتفاصيل.";

export const Route = createFileRoute("/_authenticated/admin/activity-log")({
  head: () => ({
    meta: [
      { title: "سجل النشاطات | لوحة تحكم Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "سجل النشاطات | لوحة تحكم Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const activity = useQuery({ queryKey: ["admin-activity"], queryFn: () => fetchAdminActivity(300) });
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<"all" | string>("all");

  const actions = useMemo(
    () => Array.from(new Set((activity.data ?? []).map((row) => row.action))).sort(),
    [activity.data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (activity.data ?? []).filter((row) => {
      if (action !== "all" && row.action !== action) return false;
      if (!term) return true;
      return [row.actor_name, row.actor_email, row.target_name, row.target_email, actionLabel(row.action)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [activity.data, action, search]);

  return (
    <AdminShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">سجل النشاطات</h1>
          <p className="text-sm text-muted-foreground">جميع العمليات المسجلة على المنصة.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="بحث بالاسم أو البريد أو العملية"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="نوع العملية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل العمليات</SelectItem>
              {actions.map((value) => (
                <SelectItem key={value} value={value}>
                  {actionLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {activity.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">لا توجد نشاطات مطابقة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">العملية</th>
                      <th className="p-3 font-medium">المنفّذ</th>
                      <th className="p-3 font-medium">نيابة عن</th>
                      <th className="p-3 font-medium">الكيان</th>
                      <th className="p-3 font-medium">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="p-3">
                          <Badge variant="secondary">{actionLabel(row.action)}</Badge>
                        </td>
                        <td className="p-3">
                          {row.actor_id ? (
                            <Link
                              to="/admin/users/$id"
                              params={{ id: row.actor_id }}
                              className="text-primary hover:underline"
                            >
                              {row.actor_name ?? row.actor_email ?? "—"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3">
                          {row.acting_for_id ? (
                            <Link
                              to="/admin/users/$id"
                              params={{ id: row.acting_for_id }}
                              className="text-primary hover:underline"
                            >
                              {row.target_name ?? row.target_email ?? "—"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {row.entity_type ? `${row.entity_type}${row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}` : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">{formatDateTime(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
