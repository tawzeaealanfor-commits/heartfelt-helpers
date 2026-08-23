import { supabase } from "@/integrations/supabase/client";

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

export async function fetchSellersOverview(): Promise<SellersOverview> {
  const { data, error } = await supabase.rpc("sellers_overview");
  if (error) throw new Error(error.message);
  return data as unknown as SellersOverview;
}
