import { supabase } from "@/integrations/supabase/client";

export type OrderStatus = "new" | "in_progress" | "confirmed" | "rejected" | "cancelled";

export type OrderItem = {
  id: string;
  order_no: number;
  customer_name: string;
  product_name: string;
  amount: number;
  status: OrderStatus;
  call_status: string;
  handled: boolean;
  created_at: string;
  attempts_count: number;
  is_late: boolean;
  seller_name: string | null;
  call_center_name: string | null;
  call_center_rating: number | null;
  recordings_count: number;
  screenshots_count: number;
};

export type OrdersOverview = {
  stats: {
    total: number;
    new: number;
    in_progress: number;
    confirmed: number;
    rejected: number;
    unconfirmed: number;
    unhandled: number;
    late: number;
  };
  items: OrderItem[];
};

export type OrderCall = {
  id: string;
  started_at: string;
  ended_at: string | null;
  recording_url: string | null;
  screenshot_url: string | null;
  outcome: string | null;
  note: string | null;
  call_center_name: string | null;
};

export type OrderDetail = {
  order: {
    id: string;
    order_no: number;
    customer_name: string;
    product_name: string;
    amount: number;
    status: OrderStatus;
    call_status: string;
    handled: boolean;
    attempts_count: number;
    target_response_minutes: number;
    first_attempt_at: string | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
    seller_id: string | null;
    seller_name: string | null;
    call_center_id: string | null;
    call_center_name: string | null;
    call_center_code: string | null;
  } | null;
  calls: OrderCall[];
  complaints: { id: string; subject: string; status: string; created_at: string }[];
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  confirmed: "مؤكد",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

export const ORDER_STATUS_TONE: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export const CALL_STATUS_LABELS: Record<string, string> = {
  not_called: "لم يتم الاتصال",
  answered: "تم الرد",
  no_answer: "لا يوجد رد",
  busy: "مشغول",
  unreachable: "تعذر الاتصال",
};

export const orderStatusLabel = (v: string) => ORDER_STATUS_LABELS[v] ?? v;
export const callStatusLabel = (v: string) => CALL_STATUS_LABELS[v] ?? v;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export async function fetchOrdersOverview(): Promise<OrdersOverview> {
  const { data, error } = await supabase.rpc("admin_orders_overview");
  if (error) throw new Error(error.message);
  return data as unknown as OrdersOverview;
}

export async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  const { data, error } = await supabase.rpc("admin_order_detail", { _id: id });
  if (error) throw new Error(error.message);
  return data as unknown as OrderDetail;
}
