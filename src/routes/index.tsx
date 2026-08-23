import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

const description =
  "تسجيل دخول فريق الإدارة والمشرفين والموظفين إلى منصة Kassebni_Call2Sell لإدارة الطلبات والبائعين ومراكز الاتصال.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسجيل دخول الإدارة | Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "تسجيل دخول الإدارة | Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="staff" mode="login" />,
});
