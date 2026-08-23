import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { DataFilters } from "@/components/admin/DataFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { applyFilters, type FilterColumn, type FilterRow } from "@/lib/filters";

const FILTER_COLUMNS: FilterColumn[] = [
  { key: "full_name", label: "الاسم", type: "text" },
  {
    key: "account_type",
    label: "نوع الحساب",
    type: "enum",
    format: (v) => ACCOUNT_TYPE_LABELS[v as AccountType] ?? v,
  },
  { key: "email", label: "البريد", type: "text" },
  { key: "phone", label: "الهاتف", type: "text" },
  {
    key: "status",
    label: "الحالة",
    type: "enum",
    format: (v) => ACCOUNT_STATUS_LABELS[v as AccountStatus] ?? v,
  },
];

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
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [sort, setSort] = useState<SortKey>("created_at");
  const [asc, setAsc] = useState(false);

  const all = users.data ?? [];

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? all.filter((u) =>
          [u.full_name, u.email, u.phone].some((v) => (v ?? "").toLowerCase().includes(term)),
        )
      : all;

    const filtered = applyFilters(
      bySearch as unknown as Record<string, unknown>[],
      filters,
      FILTER_COLUMNS,
    ) as unknown as AdminUserRow[];

    return [...filtered].sort((a, b) => {
      const av = (a[sort] ?? "") as string;
      const bv = (b[sort] ?? "") as string;
      return asc ? av.localeCompare(bv, "ar") : bv.localeCompare(av, "ar");
    });
  }, [all, search, filters, sort, asc]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">المستخدمون</h1>

        <div className="space-y-2">
          <DataFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="ابحث بالاسم أو البريد أو الهاتف"
            columns={FILTER_COLUMNS}
            rows={all as unknown as Record<string, unknown>[]}
            filters={filters}
            onFiltersChange={setFilters}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">الترتيب</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-40 rounded-full bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">تاريخ التسجيل</SelectItem>
                <SelectItem value="full_name">الاسم</SelectItem>
                <SelectItem value="last_sign_in_at">آخر دخول</SelectItem>
                <SelectItem value="account_type">نوع الحساب</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full bg-card"
              aria-label="عكس الترتيب"
              onClick={() => setAsc((v) => !v)}
            >
              <ArrowUpDown className="size-4" />
            </Button>
          </div>
        </div>


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
