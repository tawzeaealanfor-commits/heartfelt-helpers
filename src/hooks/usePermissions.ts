import { useQuery } from "@tanstack/react-query";

import { fetchMyPermissions } from "@/lib/roles";

export function usePermissions() {
  const query = useQuery({
    queryKey: ["my-permissions"],
    queryFn: fetchMyPermissions,
    staleTime: 60_000,
  });
  const list = query.data ?? [];
  return {
    ...query,
    permissions: list,
    can: (permission: string) => list.includes(permission),
  };
}
