import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CallCenterItem = {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive" | "disabled";
  score: number;
  orders_received: number;
  confirm_rate: number;
  avg_response_minutes: number;
  avg_finish_minutes: number;
  avg_call_seconds: number;
  avg_idle_minutes: number;
  total_complaints: number;
  open_complaints: number;
};

export type CallCentersOverview = {
  stats: {
    total: number;
    active: number;
    active_rate: number;
    total_orders: number;
    confirm_rate: number;
    avg_response_minutes: number;
    avg_finish_minutes: number;
    avg_call_seconds: number;
    avg_idle_minutes: number;
    avg_score: number;
    total_complaints: number;
    open_complaints: number;
  };
  items: CallCenterItem[];
};

export const getCallCentersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CallCentersOverview> => {
    const rpc = context.supabase.rpc as unknown as (
      name: string,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data, error } = await rpc("call_centers_overview");
    if (error) throw new Error(error.message);
    return data as CallCentersOverview;
  });
