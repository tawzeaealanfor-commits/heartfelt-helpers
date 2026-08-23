import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/callcenter/")({
  beforeLoad: () => {
    throw redirect({ to: "/callcenter/login", replace: true });
  },
});
