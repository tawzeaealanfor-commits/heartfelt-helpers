import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount, logActivity } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCOUNT_TYPE_LABELS,
  PORTAL_ALLOWED_TYPES,
  PORTAL_LABELS,
  dashboardPathFor,
  loginPathFor,
  primaryAccountType,
  type AccountType,
  type Portal,
} from "@/lib/access";
import { DEMO_CALL_CENTER_ID, DEMO_SELLER_ID } from "@/lib/demo";

export type ActingTarget = {
  userId: string;
  name: string;
  accountType: AccountType;
  sellerId: string | null;
  callCenterId: string | null;
};

type UserDetail = {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    seller_id: string | null;
    call_center_id: string | null;
  } | null;
  roles: string[];
};

export function PortalShell({
  portal,
  children,
}: {
  portal: Portal;
  children: (ctx: {
    sellerId: string | null;
    callCenterId: string | null;
    actingFor: ActingTarget | null;
    userId: string;
  }) => ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocation();
  const account = useAccount();

  const params = new URLSearchParams(location.searchStr ?? "");
  const actingId = params.get("as");
  const isAdmin = account.data?.isAdmin === true;
  const demo = params.get("demo") === "1" && isAdmin;

  const target = useQuery({
    queryKey: ["acting-target", actingId],
    enabled: Boolean(actingId) && isAdmin,
    queryFn: async (): Promise<ActingTarget | null> => {
      const { data, error } = await supabase.rpc("admin_user_detail", { _id: actingId! });
      if (error) throw new Error(error.message);
      const detail = data as unknown as UserDetail;
      if (!detail?.profile) return null;
      return {
        userId: detail.profile.id,
        name: detail.profile.full_name ?? detail.profile.email,
        accountType: primaryAccountType(detail.roles ?? []),
        sellerId: detail.profile.seller_id,
        callCenterId: detail.profile.call_center_id,
      };
    },
  });

  const acting = actingId && isAdmin ? target.data ?? null : null;
  const allowed =
    account.data &&
    (PORTAL_ALLOWED_TYPES[portal].includes(account.data.accountType) ||
      (isAdmin && (Boolean(actingId) || demo)));

  useEffect(() => {
    if (account.isLoading || !account.data) return;
    if (!allowed) {
      navigate({ to: dashboardPathFor(account.data.accountType), replace: true });
    }
  }, [account.isLoading, account.data, allowed, navigate]);

  const signOut = async () => {
    await logActivity("auth.logout", { entityType: "user", entityId: account.data?.userId });
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: loginPathFor(portal), replace: true });
  };

  if (account.isLoading || (actingId && isAdmin && target.isLoading)) {
    return (
      <div dir="rtl" className="min-h-screen space-y-4 bg-app-canvas p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!account.data || !allowed) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-app-canvas">
      {demo && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/10 px-4 py-3 text-primary">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" />
            وضع المعاينة التجريبية — البيانات المعروضة تجريبية لعرض الشكل النهائي فقط.
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/admin">العودة إلى لوحة الإدارة</Link>
          </Button>
        </div>
      )}

      {acting && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-warning/15 px-4 py-3 text-warning">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" />
            أنت تعمل حاليًا نيابة عن هذا المستخدم: {acting.name} ({ACCOUNT_TYPE_LABELS[acting.accountType]})
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/admin/users/$id" params={{ id: acting.userId }}>
              العودة إلى لوحة الإدارة
            </Link>
          </Button>
        </div>
      )}

      <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Kassebni_Call2Sell</p>
          <p className="text-xs text-muted-foreground">{PORTAL_LABELS[portal]}</p>
        </div>
        {!acting && !demo && (
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="size-4" />
            تسجيل الخروج
          </Button>
        )}
      </header>

      <main className="p-4 md:p-6">
        {children({
          sellerId: demo ? DEMO_SELLER_ID : acting ? acting.sellerId : account.data.sellerId,
          callCenterId: demo
            ? DEMO_CALL_CENTER_ID
            : acting
              ? acting.callCenterId
              : account.data.callCenterId,
          actingFor: acting,
          userId: acting ? acting.userId : account.data.userId,
        })}
      </main>
    </div>
  );
}
