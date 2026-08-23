import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { logActivity } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/access";

const description = "إدارة الأدوار والصلاحيات في منصة Kassebni_Call2Sell: منح وسحب صلاحيات كل دور.";

export const Route = createFileRoute("/_authenticated/admin/roles")({
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
  component: RolesPage,
});

const ROLES: AccountType[] = ["admin", "management", "employee", "seller", "call_center", "user"];

async function fetchMatrix() {
  const [{ data: perms, error: permsError }, { data: rp, error: rpError }] = await Promise.all([
    supabase.from("permissions").select("key, label, category").order("category"),
    supabase.from("role_permissions").select("role, permission"),
  ]);
  if (permsError) throw new Error(permsError.message);
  if (rpError) throw new Error(rpError.message);
  return {
    permissions: perms ?? [],
    granted: new Set((rp ?? []).map((r) => `${r.role}:${r.permission}`)),
  };
}

function RolesPage() {
  const queryClient = useQueryClient();
  const matrix = useQuery({ queryKey: ["role-permission-matrix"], queryFn: fetchMatrix });

  const toggle = useMutation({
    mutationFn: async (vars: { role: AccountType; permission: string; next: boolean }) => {
      if (vars.next) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role: vars.role, permission: vars.permission });
        if (error) throw new Error(error.message);
        await logActivity("admin.role_permission.grant", {
          entityType: "role",
          entityId: vars.role,
          details: { permission: vars.permission },
        });
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", vars.role)
          .eq("permission", vars.permission);
        if (error) throw new Error(error.message);
        await logActivity("admin.role_permission.revoke", {
          entityType: "role",
          entityId: vars.role,
          details: { permission: vars.permission },
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["role-permission-matrix"] });
      await queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الصلاحية."),
  });

  const groups = new Map<string, { key: string; label: string; category: string }[]>();
  for (const permission of matrix.data?.permissions ?? []) {
    const list = groups.get(permission.category) ?? [];
    list.push(permission);
    groups.set(permission.category, list);
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">الأدوار والصلاحيات</h1>

        {matrix.isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          Array.from(groups.entries()).map(([category, items]) => (
            <Card key={category} className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{category}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="p-3 text-right font-medium">الصلاحية</th>
                      {ROLES.map((role) => (
                        <th key={role} className="p-3 text-center font-medium">
                          {ACCOUNT_TYPE_LABELS[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((permission) => (
                      <tr key={permission.key} className="border-b last:border-0">
                        <td className="p-3">{permission.label}</td>
                        {ROLES.map((role) => {
                          const checked =
                            role === "admin" || matrix.data!.granted.has(`${role}:${permission.key}`);
                          return (
                            <td key={role} className="p-3 text-center">
                              <Switch
                                checked={checked}
                                disabled={role === "admin" || toggle.isPending}
                                onCheckedChange={(next) =>
                                  toggle.mutate({ role, permission: permission.key, next })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))
        )}

        {!matrix.isLoading && groups.size === 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-5 text-sm text-muted-foreground">لا توجد صلاحيات معرّفة بعد.</CardContent>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
