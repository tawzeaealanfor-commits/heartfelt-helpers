import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Headset, Home, LogOut, Menu, ShieldCheck, ShoppingCart, Store, UserCog, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MAIN_ITEMS = [
  { to: "/admin", label: "الرئيسية", icon: Home, exact: true },
  { to: "/admin/orders", label: "الطلبات", icon: ShoppingCart, exact: false },
  { to: "/admin/call-centers", label: "الكول سنتر", icon: Headset, exact: false },
  { to: "/admin/sellers", label: "Sellers", icon: Store, exact: false },
] as const;


const USER_ITEMS = [
  { to: "/admin/users", label: "المستخدمون", icon: Users, exact: false },
  { to: "/admin/employees", label: "الموظفون", icon: UserCog, exact: false },
  { to: "/admin/roles-permissions", label: "الأدوار والصلاحيات", icon: ShieldCheck, exact: false },
  { to: "/admin/activity-log", label: "سجل النشاطات", icon: Activity, exact: false },
] as const;

const linkClass = cn(
  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground",
  "transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
);

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <div className="px-2 pb-4">
        <p className="text-lg font-bold text-sidebar-foreground">Kassebni_Call2Sell</p>
        <p className="text-xs text-muted-foreground">لوحة تحكم الإدارة</p>
      </div>

      {MAIN_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          onClick={onNavigate}
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          className={linkClass}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}

      <p className="px-3 pb-1 pt-5 text-xs font-semibold text-muted-foreground">إدارة المستخدمين</p>
      {USER_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          onClick={onNavigate}
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          className={linkClass}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/", replace: true });
  };

  return (
    <div dir="rtl" className="flex min-h-screen bg-app-canvas">
      <aside className="hidden w-64 shrink-0 border-l border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="القائمة">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-sidebar p-0">
                <SheetTitle className="sr-only">القائمة الجانبية</SheetTitle>
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold lg:hidden">Kassebni_Call2Sell</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="size-4" />
            تسجيل الخروج
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
