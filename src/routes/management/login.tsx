import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

const description =
  "تسجيل دخول فريق الإدارة والموظفين إلى منصة Kassebni_Call2Sell حسب الدور والصلاحيات الممنوحة.";

export const Route = createFileRoute("/management/login")({
  head: () => ({
    meta: [
      { title: "دخول فريق الإدارة | Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "دخول فريق الإدارة | Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="staff" mode="login" />,
});
