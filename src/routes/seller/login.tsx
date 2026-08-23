import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

const description = "تسجيل دخول البائعين إلى منصة Kassebni_Call2Sell لمتابعة الطلبات والأداء.";

export const Route = createFileRoute("/seller/login")({
  head: () => ({
    meta: [
      { title: "تسجيل دخول البائعين | Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "تسجيل دخول البائعين | Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="seller" mode="login" />,
});
