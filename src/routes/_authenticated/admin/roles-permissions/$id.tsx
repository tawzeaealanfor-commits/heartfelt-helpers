import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/admin-users";
import {
  ROLE_STATUS_LABELS,
  ROLE_STATUS_TONE,
  fetchPermissions,
  fetchRolePermissions,
  fetchStaffRole,
  saveRolePermissions,
  updateStaffRole,
  type StaffRoleStatus,
} from "@/lib/roles";

const description = "تفاصيل الدور الإداري وصلاحياته في Kassebni_Call2Sell.";

export const Route = createFileRoute("/_authenticated/admin/roles-permissions/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الدور | لوحة تحكم Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "تفاصيل الدور | لوحة تحكم Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoleDetailsPage,
});

function RoleDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const role = useQuery({ queryKey: ["staff-role", id], queryFn: () => fetchStaffRole(id) });
  const permissions = useQuery({ queryKey: ["permissions"], queryFn: fetchPermissions });
  const rolePermissions = useQuery({
    queryKey: ["staff-role-permissions", id],
    queryFn: () => fetchRolePermissions(id),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<StaffRoleStatus>("active");

  const isSystem = role.data?.is_system ?? false;

  useEffect(() => {
    if (rolePermissions.data) setSelected(rolePermissions.data);
  }, [rolePermissions.data]);

  useEffect(() => {
    if (!role.data) return;
    setName(role.data.name);
    setDesc(role.data.description);
    setStatus(role.data.status);
  }, [role.data]);

  const savePermissions = useMutation({
    mutationFn: () => saveRolePermissions(id, selected),
    onSuccess: async () => {
      toast.success("تم حفظ صلاحيات الدور.");
      await queryClient.invalidateQueries({ queryKey: ["staff-role-permissions", id] });
      await queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الصلاحيات."),
  });

  const saveDetails = useMutation({
    mutationFn: () => updateStaffRole(id, { name: name.trim(), description: desc.trim(), status }),
    onSuccess: async () => {
      toast.success("تم تحديث بيانات الدور.");
      await queryClient.invalidateQueries({ queryKey: ["staff-role", id] });
      await queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الدور."),
  });

  if (role.isLoading) {
    return (
      <AdminShell>
        <Skeleton className="h-96 w-full" />
      </AdminShell>
    );
  }

  if (!role.data) {
    return (
      <AdminShell>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
            <p>الدور غير موجود.</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/admin/roles-permissions">العودة إلى الأدوار والصلاحيات</Link>
            </Button>
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  const data = role.data;

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.description || "بدون وصف"}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/admin/roles-permissions">
              العودة
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">الحالة</p>
              <Badge variant="outline" className={ROLE_STATUS_TONE[data.status]}>
                {ROLE_STATUS_LABELS[data.status]}
              </Badge>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">عدد الموظفين</p>
              <p className="text-lg font-bold">{data.employees_count}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">عدد الصلاحيات</p>
              <p className="text-lg font-bold">{data.permissions_count}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">آخر تعديل</p>
              <p className="text-sm">{formatDateTime(data.updated_at)}</p>
              <p className="text-xs text-muted-foreground">أُنشئ: {formatDateTime(data.created_at)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">بيانات الدور</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="r-name">اسم الدور</Label>
              <Input id="r-name" value={name} disabled={isSystem} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-desc">الوصف</Label>
              <Textarea id="r-desc" value={desc} disabled={isSystem} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={status}
                disabled={isSystem}
                onValueChange={(v) => setStatus(v as StaffRoleStatus)}
              >
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{ROLE_STATUS_LABELS.active}</SelectItem>
                  <SelectItem value="disabled">{ROLE_STATUS_LABELS.disabled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Button
                className="rounded-full"
                disabled={isSystem || saveDetails.isPending}
                onClick={() => saveDetails.mutate()}
              >
                حفظ بيانات الدور
              </Button>
              {isSystem && (
                <p className="pt-2 text-xs text-muted-foreground">
                  دور النظام (Super Admin) يمتلك جميع الصلاحيات ولا يمكن تعديله أو تعطيله.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base">صلاحيات الدور</CardTitle>
            <Button
              size="sm"
              className="rounded-full"
              disabled={isSystem || savePermissions.isPending || rolePermissions.isLoading}
              onClick={() => savePermissions.mutate()}
            >
              حفظ الصلاحيات
            </Button>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {permissions.isLoading || rolePermissions.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PermissionMatrix
                permissions={permissions.data ?? []}
                selected={isSystem ? (permissions.data ?? []).map((p) => p.key) : selected}
                onChange={setSelected}
                disabled={isSystem}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
