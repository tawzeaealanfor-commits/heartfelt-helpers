import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SellerItem = {
  id: string;
  name: string;
  category: string;
  status: "active" | "review" | "suspended";
  balance: number;
  score: number;
  orders_count: number;
  confirmed_count: number;
  confirm_rate: number;
};

export type SellersOverview = {
  stats: {
    total: number;
    active: number;
    inactive: number;
    total_orders: number;
  };
  items: SellerItem[];
};

export const getSellersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SellersOverview> => {
    const rpc = context.supabase.rpc as unknown as (
      name: string,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data, error } = await rpc("sellers_overview");
    if (error) throw new Error(error.message);
    return data as SellersOverview;
  });
