import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { loginPathFor, portalFromPath } from "@/lib/access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // البوابة تتحدد من الـRoute نفسه، بدون صفحة اختيار نوع حساب
      throw redirect({ to: loginPathFor(portalFromPath(location.pathname)) });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
