import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/admin-users";
import {
  ROLE_STATUS_LABELS,
  ROLE_STATUS_TONE,
  createStaffRole,
  deleteStaffRole,
  duplicateStaffRole,
  fetchPermissions,
  fetchStaffRoles,
  updateStaffRole,
  type StaffRoleRow,
  type StaffRoleStatus,
} from "@/lib/roles";

const description =
  "إدارة الأدوار والصلاحيات الإدارية في Kassebni_Call2Sell: إنشاء الأدوار وتعديل صلاحياتها وتعطيلها.";

export const Route = createFileRoute("/_authenticated/admin/roles-permissions/")({
  head: () => ({
    meta: [
      { title: "الأدوار والصلاحيات | لوحة تحكم Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "الأدوار والصلاحيات | لوحة تحكم Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RolesPermissionsPage,
});

function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const roles = useQuery({ queryKey: ["staff-roles"], queryFn: fetchStaffRoles });
  const permissions = useQuery({ queryKey: ["permissions"], queryFn: fetchPermissions });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<StaffRoleStatus>("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<StaffRoleRow | null>(null);
  const [toToggle, setToToggle] = useState<StaffRoleRow | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff-roles"] });

  const create = useMutation({
    mutationFn: () => createStaffRole({ name, description: desc, status, permissions: selected }),
    onSuccess: async () => {
      toast.success("تم إنشاء الدور.");
      setCreating(false);
      setName("");
      setDesc("");
      setStatus("active");
      setSelected([]);
      await refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر إنشاء الدور."),
  });

  const toggleStatus = useMutation({
    mutationFn: (role: StaffRoleRow) =>
      updateStaffRole(role.id, { status: role.status === "active" ? "disabled" : "active" }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة الدور.");
      setToToggle(null);
      await refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر التحديث."),
  });

  const duplicate = useMutation({
    mutationFn: (role: StaffRoleRow) => duplicateStaffRole(role),
    onSuccess: async () => {
      toast.success("تم نسخ الدور (معطل افتراضيًا).");
      await refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر نسخ الدور."),
  });

  const remove = useMutation({
    mutationFn: (role: StaffRoleRow) => deleteStaffRole(role.id),
    onSuccess: async () => {
      toast.success("تم حذف الدور.");
      setToDelete(null);
      await refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذر حذف الدور، تأكد من عدم ارتباطه بموظفين."),
  });

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">الأدوار والصلاحيات</h1>
            <p className="text-sm text-muted-foreground">
              أدوار الموظفين الإداريين وصلاحياتهم داخل المنصة. لا تحدد هذه الصفحة نوع الحساب.
            </p>
          </div>
          <Button className="gap-2 rounded-full" onClick={() => setCreating((v) => !v)}>
            <Plus className="size-4" />
            إنشاء دور جديد
          </Button>
        </div>

        {creating && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">دور جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="r-name">اسم الدور</Label>
                  <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>الحالة</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as StaffRoleStatus)}>
                    <SelectTrigger className="rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="disabled">معطل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="r-desc">الوصف</Label>
                  <Textarea id="r-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
                </div>
              </div>

              {permissions.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <PermissionMatrix
                  permissions={permissions.data ?? []}
                  selected={selected}
                  onChange={setSelected}
                />
              )}

              <div className="flex gap-2">
                <Button className="rounded-full" disabled={create.isPending} onClick={() => create.mutate()}>
                  حفظ الدور
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => setCreating(false)}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-0">
            {roles.isLoading ? (
              <div className="space-y-2 p-5">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (roles.data ?? []).length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">لا توجد أدوار بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-right text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">الدور</th>
                      <th className="p-3 font-medium">الموظفون</th>
                      <th className="p-3 font-medium">الصلاحيات</th>
                      <th className="p-3 font-medium">الحالة</th>
                      <th className="p-3 font-medium">تاريخ الإنشاء</th>
                      <th className="p-3 font-medium">آخر تعديل</th>
                      <th className="p-3 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(roles.data ?? []).map((role) => (
                      <tr key={role.id} className="border-b last:border-0">
                        <td className="p-3">
                          <Link
                            to="/admin/roles-permissions/$id"
                            params={{ id: role.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {role.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{role.description || "—"}</p>
                        </td>
                        <td className="p-3">{role.employees_count}</td>
                        <td className="p-3">{role.permissions_count}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={ROLE_STATUS_TONE[role.status]}>
                            {ROLE_STATUS_LABELS[role.status]}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{formatDateTime(role.created_at)}</td>
                        <td className="p-3 text-muted-foreground">{formatDateTime(role.updated_at)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                navigate({ to: "/admin/roles-permissions/$id", params: { id: role.id } })
                              }
                            >
                              تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              disabled={duplicate.isPending}
                              onClick={() => duplicate.mutate(role)}
                            >
                              <Copy className="size-3.5" />
                              نسخ
                            </Button>
                            {!role.is_system && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => setToToggle(role)}>
                                  {role.status === "active" ? "تعطيل" : "تفعيل"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-destructive"
                                  disabled={role.employees_count > 0}
                                  onClick={() => setToDelete(role)}
                                >
                                  <Trash2 className="size-3.5" />
                                  حذف
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!toToggle} onOpenChange={(open) => !open && setToToggle(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toToggle?.status === "active" ? "تعطيل الدور" : "تفعيل الدور"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toToggle?.status === "active"
                ? "عند التعطيل لن يمكن تعيين هذا الدور لموظفين جدد، ولن تُحذف بياناته أو صلاحياته."
                : "سيصبح الدور متاحًا للتعيين للموظفين مجددًا."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => toToggle && toggleStatus.mutate(toToggle)}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدور</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذه العملية. لا يمكن حذف دور مرتبط بموظفين قبل نقلهم إلى دور آخر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete)}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
