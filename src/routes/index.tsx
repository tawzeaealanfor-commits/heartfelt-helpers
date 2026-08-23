import { createFileRoute, redirect } from "@tanstack/react-router";

// الجذر ليس صفحة مستقلة: بوابة الإدارة الرسمية هي /admin/login (بدون صفحة اختيار نوع حساب).
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/login", replace: true });
  },
});
