import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

export const Route = createFileRoute("/callcenter/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب كول سنتر | Kassebni_Call2Sell" },
      { name: "description", content: "إنشاء حساب مركز اتصال جديد في منصة Kassebni_Call2Sell." },
      { property: "og:title", content: "إنشاء حساب كول سنتر | Kassebni_Call2Sell" },
      { property: "og:description", content: "إنشاء حساب مركز اتصال جديد في منصة Kassebni_Call2Sell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="callcenter" mode="signup" />,
});
