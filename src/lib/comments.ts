import { supabase } from "@/integrations/supabase/client";

export type OrderComment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
  rating: number | null;
};

export async function fetchOrderComments(orderId: string): Promise<OrderComment[]> {
  const { data, error } = await supabase.rpc("order_comments_list", { _order_id: orderId });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrderComment[];
}

export async function addOrderComment(orderId: string, body: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول");
  const { error } = await supabase
    .from("order_comments")
    .insert({ order_id: orderId, author_id: userId, body: body.trim() });
  if (error) throw new Error(error.message);
}

export async function setOrderRating(orderId: string, rating: number) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول");
  const { error } = await supabase
    .from("order_ratings")
    .upsert({ order_id: orderId, author_id: userId, rating }, { onConflict: "order_id,author_id" });
  if (error) throw new Error(error.message);
}

export async function fetchMyOrderRating(orderId: string): Promise<number | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data } = await supabase
    .from("order_ratings")
    .select("rating")
    .eq("order_id", orderId)
    .eq("author_id", userId)
    .maybeSingle();
  return data?.rating ?? null;
}

export async function fetchUnreadComments(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("order_comments_unread");
  if (error) throw new Error(error.message);
  return (data ?? {}) as unknown as Record<string, number>;
}

export async function markOrderCommentsRead(orderId: string) {
  const { error } = await supabase.rpc("mark_order_comments_read", { _order_id: orderId });
  if (error) throw new Error(error.message);
}

export async function markAllOrderCommentsRead() {
  const { error } = await supabase.rpc("mark_all_order_comments_read");
  if (error) throw new Error(error.message);
}
