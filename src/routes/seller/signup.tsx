import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

export const Route = createFileRoute("/seller/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب بائع | Kassebni_Call2Sell" },
      { name: "description", content: "إنشاء حساب بائع جديد في منصة Kassebni_Call2Sell وبدء استقبال الطلبات." },
      { property: "og:title", content: "إنشاء حساب بائع | Kassebni_Call2Sell" },
      { property: "og:description", content: "إنشاء حساب بائع جديد في منصة Kassebni_Call2Sell وبدء استقبال الطلبات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="seller" mode="signup" />,
});
