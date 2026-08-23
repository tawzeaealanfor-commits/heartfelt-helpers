import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONE,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
} from "@/lib/access";
import { fetchAdminUsers, formatDateTime } from "@/lib/admin-users";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_STATUS_LABELS, assignStaffRole, fetchStaffRoles } from "@/lib/roles";
import {
  adminCreateEmployee,
  adminSetUserRole,
  adminSetUserStatus,
} from "@/lib/admin-users.functions";

const description = "إدارة موظفي الإدارة في Kassebni_Call2Sell: الإنشاء، الأدوار، التفعيل والتعطيل.";

export const Route = createFileRoute("/_authenticated/admin/employees")({
  head: () => ({
    meta: [
      { title: "الموظفون | لوحة تحكم Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "الموظفون | لوحة تحكم Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers });
  const staffRoles = useQuery({ queryKey: ["staff-roles"], queryFn: fetchStaffRoles });
  const staffAssignments = useQuery({
    queryKey: ["employee-staff-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, staff_role_id");
      if (error) throw new Error(error.message);
      return new Map((data ?? []).map((row) => [row.id, row.staff_role_id]));
    },
  });

  const createEmployee = useServerFn(adminCreateEmployee);
  const setRole = useServerFn(adminSetUserRole);
  const setStatus = useServerFn(adminSetUserStatus);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleValue] = useState<"employee" | "management">("employee");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const updateStaffRole = useMutation({
    mutationFn: (vars: { userId: string; roleId: string | null }) =>
      assignStaffRole(vars.userId, vars.roleId),
    onSuccess: async () => {
      toast.success("تم تعيين الدور الإداري للموظف.");
      await queryClient.invalidateQueries({ queryKey: ["employee-staff-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذر تعيين الدور."),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!fullName || !email || password.length < 8) {
        throw new Error("يرجى إدخال الاسم والبريد وكلمة مرور لا تقل عن 8 أحرف.");
      }
      await createEmployee({ data: { fullName, email, phone, password, role } });
    },
    onSuccess: async () => {
      toast.success("تم إنشاء حساب الموظف.");
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      await refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الحساب."),
  });

  const updateRole = useMutation({
    mutationFn: (vars: { userId: string; role: AccountType }) => setRole({ data: vars }),
    onSuccess: async () => {
      toast.success("تم تحديث الدور.");
      await refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر التحديث."),
  });

  const updateStatus = useMutation({
    mutationFn: (vars: { userId: string; status: "active" | "disabled" }) => setStatus({ data: vars }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة الموظف.");
      await refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر التحديث."),
  });

  const employees = (users.data ?? []).filter(
    (u) => u.account_type === "employee" || u.account_type === "management",
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold">الموظفون</h1>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">إنشاء موظف جديد</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="e-name">الاسم</Label>
              <Input id="e-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-email">البريد الإلكتروني</Label>
              <Input id="e-email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-phone">رقم الهاتف</Label>
              <Input id="e-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-pass">كلمة مرور مؤقتة</Label>
              <Input id="e-pass" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={role} onValueChange={(v) => setRoleValue(v as typeof role)}>
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{ACCOUNT_TYPE_LABELS.employee}</SelectItem>
                  <SelectItem value="management">{ACCOUNT_TYPE_LABELS.management}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full rounded-full" disabled={create.isPending} onClick={() => create.mutate()}>
                إنشاء الموظف
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-0">
            {users.isLoading ? (
              <div className="space-y-2 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : employees.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">لا يوجد موظفون بعد.</p>
            ) : (
              <div className="divide-y">
                {employees.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.full_name ?? u.email}</p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {u.email}
                      </p>
                      <p className="text-xs text-muted-foreground">تاريخ التسجيل: {formatDateTime(u.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={ACCOUNT_STATUS_TONE[u.status]}>
                        {ACCOUNT_STATUS_LABELS[u.status]}
                      </Badge>
                      <Select
                        value={u.account_type}
                        onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as AccountType })}
                      >
                        <SelectTrigger className="w-32 rounded-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">{ACCOUNT_TYPE_LABELS.employee}</SelectItem>
                          <SelectItem value="management">{ACCOUNT_TYPE_LABELS.management}</SelectItem>
                        </SelectContent>
                      </Select>
                      {u.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: "disabled" })}
                        >
                          تعطيل
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: "active" })}
                        >
                          إعادة تفعيل
                        </Button>
                      )}
                      <Select
                        value={staffAssignments.data?.get(u.id) ?? "none"}
                        onValueChange={(v) =>
                          updateStaffRole.mutate({ userId: u.id, roleId: v === "none" ? null : v })
                        }
                      >
                        <SelectTrigger className="w-44 rounded-full">
                          <SelectValue placeholder="الدور الإداري" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون دور إداري</SelectItem>
                          {(staffRoles.data ?? []).map((r) => (
                            <SelectItem
                              key={r.id}
                              value={r.id}
                              disabled={r.status === "disabled" && staffAssignments.data?.get(u.id) !== r.id}
                            >
                              {r.name}
                              {r.status === "disabled" ? ` (${ROLE_STATUS_LABELS.disabled})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/users/$id" params={{ id: u.id }}>
                          فتح الملف
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
