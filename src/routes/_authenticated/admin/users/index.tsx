import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONE,
  ACCOUNT_TYPE_LABELS,
  type AccountStatus,
  type AccountType,
} from "@/lib/access";
import { fetchAdminUsers, formatDateTime, type AdminUserRow } from "@/lib/admin-users";

const description = "إدارة جميع مستخدمي منصة Kassebni_Call2Sell: البائعون، الكول سنتر، الموظفون والمشرفون.";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  head: () => ({
    meta: [
      { title: "المستخدمون | لوحة تحكم Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "المستخدمون | لوحة تحكم Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

type SortKey = "full_name" | "created_at" | "last_sign_in_at" | "account_type";

function UsersPage() {
  const navigate = useNavigate();
  const users = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers });

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | AccountType>("all");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = (users.data ?? []).filter((u) => {
      if (type !== "all" && u.account_type !== type) return false;
      if (status !== "all" && u.status !== status) return false;
      if (from && new Date(u.created_at) < new Date(`${from}T00:00:00`)) return false;
      if (to && new Date(u.created_at) > new Date(`${to}T23:59:59`)) return false;
      if (!term) return true;
      return [u.full_name, u.email, u.phone].some((v) => (v ?? "").toLowerCase().includes(term));
    });

    list = [...list].sort((a, b) => {
      const av = (a[sort] ?? "") as string;
      const bv = (b[sort] ?? "") as string;
      return asc ? av.localeCompare(bv, "ar") : bv.localeCompare(av, "ar");
    });
    return list;
  }, [users.data, search, type, status, from, to, sort, asc]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">المستخدمون</h1>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-[14rem] flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">بحث بالاسم أو البريد أو الهاتف</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-full" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">نوع الحساب</label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="w-40 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">حالة الحساب</label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-36 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {(Object.keys(ACCOUNT_STATUS_LABELS) as AccountStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {ACCOUNT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">التسجيل من</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 rounded-full" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">إلى</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 rounded-full" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">الترتيب</label>
              <div className="flex gap-2">
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-40 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">تاريخ التسجيل</SelectItem>
                    <SelectItem value="full_name">الاسم</SelectItem>
                    <SelectItem value="last_sign_in_at">آخر دخول</SelectItem>
                    <SelectItem value="account_type">نوع الحساب</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setAsc((v) => !v)}>
                  <ArrowUpDown className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {users.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : users.isError ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              تعذر تحميل المستخدمين. تأكد من صلاحيات حسابك.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3">الاسم</th>
                      <th className="p-3">نوع الحساب</th>
                      <th className="p-3">البريد</th>
                      <th className="p-3">الهاتف</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">تاريخ التسجيل</th>
                      <th className="p-3">آخر دخول</th>
                      <th className="p-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          لا توجد نتائج مطابقة.
                        </td>
                      </tr>
                    ) : (
                      rows.map((u: AdminUserRow) => (
                        <tr key={u.id} className="hover:bg-muted/40">
                          <td className="p-3 font-medium">{u.full_name ?? "—"}</td>
                          <td className="p-3">{ACCOUNT_TYPE_LABELS[u.account_type] ?? u.account_type}</td>
                          <td className="p-3" dir="ltr">{u.email}</td>
                          <td className="p-3" dir="ltr">{u.phone ?? "—"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={ACCOUNT_STATUS_TONE[u.status]}>
                              {ACCOUNT_STATUS_LABELS[u.status]}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs">{formatDateTime(u.created_at)}</td>
                          <td className="p-3 text-xs">{formatDateTime(u.last_sign_in_at)}</td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => navigate({ to: "/admin/users/$id", params: { id: u.id } })}
                            >
                              فتح الملف
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
