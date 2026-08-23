export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          acting_for_id: string | null
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          acting_for_id?: string | null
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          acting_for_id?: string | null
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      call_centers: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          score: number
          status: Database["public"]["Enums"]["callcenter_status"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          score?: number
          status?: Database["public"]["Enums"]["callcenter_status"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          score?: number
          status?: Database["public"]["Enums"]["callcenter_status"]
        }
        Relationships: []
      }
      calls: {
        Row: {
          call_center_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          note: string | null
          order_id: string
          outcome: string | null
          recording_url: string | null
          screenshot_url: string | null
          started_at: string
        }
        Insert: {
          call_center_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          order_id: string
          outcome?: string | null
          recording_url?: string | null
          screenshot_url?: string | null
          started_at: string
        }
        Update: {
          call_center_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          order_id?: string
          outcome?: string | null
          recording_url?: string | null
          screenshot_url?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_call_center_id_fkey"
            columns: ["call_center_id"]
            isOneToOne: false
            referencedRelation: "call_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number | null
          status: Database["public"]["Enums"]["complaint_status"]
          subject: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["complaint_status"]
          subject: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["complaint_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_comment_reads: {
        Row: {
          id: string
          last_read_at: string
          order_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          order_id: string
          user_id?: string
        }
        Update: {
          id?: string
          last_read_at?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_comment_reads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          order_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          order_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_comments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ratings: {
        Row: {
          author_id: string
          created_at: string
          id: string
          order_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          order_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          attempts_count: number
          call_center_id: string | null
          call_status: string
          closed_at: string | null
          created_at: string
          customer_name: string
          first_attempt_at: string | null
          handled: boolean
          id: string
          order_no: number
          product_name: string
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          target_response_minutes: number
          updated_at: string
        }
        Insert: {
          amount?: number
          attempts_count?: number
          call_center_id?: string | null
          call_status?: string
          closed_at?: string | null
          created_at?: string
          customer_name?: string
          first_attempt_at?: string | null
          handled?: boolean
          id?: string
          order_no?: number
          product_name?: string
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          target_response_minutes?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          attempts_count?: number
          call_center_id?: string | null
          call_status?: string
          closed_at?: string | null
          created_at?: string
          customer_name?: string
          first_attempt_at?: string | null
          handled?: boolean
          id?: string
          order_no?: number
          product_name?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          target_response_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_call_center_id_fkey"
            columns: ["call_center_id"]
            isOneToOne: false
            referencedRelation: "call_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          key: string
          label: string
        }
        Insert: {
          category?: string
          key: string
          label: string
        }
        Update: {
          category?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          call_center_id: string | null
          created_at: string
          email: string
          force_password_change: boolean
          full_name: string | null
          id: string
          last_sign_in_at: string | null
          password_set: boolean
          phone: string | null
          seller_id: string | null
          staff_role_id: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          call_center_id?: string | null
          created_at?: string
          email: string
          force_password_change?: boolean
          full_name?: string | null
          id: string
          last_sign_in_at?: string | null
          password_set?: boolean
          phone?: string | null
          seller_id?: string | null
          staff_role_id?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          call_center_id?: string | null
          created_at?: string
          email?: string
          force_password_change?: boolean
          full_name?: string | null
          id?: string
          last_sign_in_at?: string | null
          password_set?: boolean
          phone?: string | null
          seller_id?: string | null
          staff_role_id?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_call_center_id_fkey"
            columns: ["call_center_id"]
            isOneToOne: false
            referencedRelation: "call_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          balance: number
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          score: number
          status: Database["public"]["Enums"]["seller_status"]
        }
        Insert: {
          balance?: number
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          score?: number
          status?: Database["public"]["Enums"]["seller_status"]
        }
        Update: {
          balance?: number
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          score?: number
          status?: Database["public"]["Enums"]["seller_status"]
        }
        Relationships: []
      }
      staff_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_permissions_permission_fkey"
            columns: ["permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "staff_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          description: string
          id: string
          is_system: boolean
          name: string
          status: Database["public"]["Enums"]["staff_role_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name: string
          status?: Database["public"]["Enums"]["staff_role_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name?: string
          status?: Database["public"]["Enums"]["staff_role_status"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          call_center_id: string | null
          created_at: string
          id: string
          seller_id: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          amount: number
          call_center_id?: string | null
          created_at?: string
          id?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          amount?: number
          call_center_id?: string | null
          created_at?: string
          id?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_call_center_id_fkey"
            columns: ["call_center_id"]
            isOneToOne: false
            referencedRelation: "call_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_fkey"
            columns: ["permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sellers_overview: {
        Row: {
          balance: number | null
          category: string | null
          confirm_rate: number | null
          confirmed_count: number | null
          created_at: string | null
          id: string | null
          name: string | null
          orders_count: number | null
          score: number | null
          status: Database["public"]["Enums"]["seller_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_activity_log: { Args: { _limit?: number }; Returns: Json }
      admin_dashboard: { Args: { _from: string; _to: string }; Returns: Json }
      admin_order_detail: { Args: { _id: string }; Returns: Json }
      admin_orders_overview: { Args: never; Returns: Json }
      admin_user_detail: { Args: { _id: string }; Returns: Json }
      admin_users_list: { Args: never; Returns: Json }
      call_centers_overview: { Args: never; Returns: Json }
      callcenter_dashboard: { Args: { _cc_id: string }; Returns: Json }
      has_perm: { Args: { _perm: string; _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_all_order_comments_read: { Args: never; Returns: undefined }
      mark_order_comments_read: {
        Args: { _order_id: string }
        Returns: undefined
      }
      my_permissions: { Args: never; Returns: string[] }
      order_comments_list: { Args: { _order_id: string }; Returns: Json }
      order_comments_unread: { Args: never; Returns: Json }
      owns_order_as_seller: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      seller_dashboard: { Args: { _seller_id: string }; Returns: Json }
      sellers_overview: { Args: never; Returns: Json }
      staff_roles_overview: { Args: never; Returns: Json }
    }
    Enums: {
      account_status: "active" | "suspended" | "disabled"
      app_role:
        | "admin"
        | "seller"
        | "call_center"
        | "user"
        | "management"
        | "employee"
      callcenter_status: "active" | "inactive" | "disabled"
      complaint_status: "open" | "resolved"
      order_status:
        | "new"
        | "in_progress"
        | "confirmed"
        | "rejected"
        | "cancelled"
      seller_status: "active" | "review" | "suspended"
      staff_role_status: "active" | "disabled"
      tx_status: "pending" | "completed" | "rejected"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "incentive"
        | "seller_payout"
        | "callcenter_payout"
        | "platform_fee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "disabled"],
      app_role: [
        "admin",
        "seller",
        "call_center",
        "user",
        "management",
        "employee",
      ],
      callcenter_status: ["active", "inactive", "disabled"],
      complaint_status: ["open", "resolved"],
      order_status: [
        "new",
        "in_progress",
        "confirmed",
        "rejected",
        "cancelled",
      ],
      seller_status: ["active", "review", "suspended"],
      staff_role_status: ["active", "disabled"],
      tx_status: ["pending", "completed", "rejected"],
      tx_type: [
        "deposit",
        "withdrawal",
        "incentive",
        "seller_payout",
        "callcenter_payout",
        "platform_fee",
      ],
    },
  },
} as const
