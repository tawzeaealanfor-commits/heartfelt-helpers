import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

export const Route = createFileRoute("/callcenter/login")({
  head: () => ({
    meta: [
      { title: "تسجيل دخول الكول سنتر | Kassebni_Call2Sell" },
      { name: "description", content: "تسجيل دخول مراكز الاتصال إلى منصة Kassebni_Call2Sell." },
      { property: "og:title", content: "تسجيل دخول الكول سنتر | Kassebni_Call2Sell" },
      { property: "og:description", content: "تسجيل دخول مراكز الاتصال إلى منصة Kassebni_Call2Sell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="callcenter" mode="login" />,
});
