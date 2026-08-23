import { createFileRoute } from "@tanstack/react-router";

import { PortalAuth } from "@/components/portal/PortalAuth";

const description =
  "تسجيل دخول المشرفين إلى لوحة تحكم Kassebni_Call2Sell لإدارة المستخدمين والموظفين والأدوار والصلاحيات.";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "دخول المشرفين | Kassebni_Call2Sell" },
      { name: "description", content: description },
      { property: "og:title", content: "دخول المشرفين | Kassebni_Call2Sell" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalAuth portal="staff" mode="login" />,
});
