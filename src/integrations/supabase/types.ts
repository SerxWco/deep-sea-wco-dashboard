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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          feedback: string | null
          id: string
          role: string
          timestamp: string
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          feedback?: string | null
          id?: string
          role: string
          timestamp?: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          feedback?: string | null
          id?: string
          role?: string
          timestamp?: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          active_wallets: number | null
          average_transaction_size: number | null
          circulating_supply: number | null
          created_at: string
          id: string
          market_cap: number | null
          network_activity_rate: number | null
          snapshot_date: string
          snapshot_time: string
          total_holders: number | null
          total_volume: number | null
          transactions_24h: number | null
          wco_burnt_24h: number | null
          wco_burnt_total: number | null
          wco_moved_24h: number | null
        }
        Insert: {
          active_wallets?: number | null
          average_transaction_size?: number | null
          circulating_supply?: number | null
          created_at?: string
          id?: string
          market_cap?: number | null
          network_activity_rate?: number | null
          snapshot_date: string
          snapshot_time?: string
          total_holders?: number | null
          total_volume?: number | null
          transactions_24h?: number | null
          wco_burnt_24h?: number | null
          wco_burnt_total?: number | null
          wco_moved_24h?: number | null
        }
        Update: {
          active_wallets?: number | null
          average_transaction_size?: number | null
          circulating_supply?: number | null
          created_at?: string
          id?: string
          market_cap?: number | null
          network_activity_rate?: number | null
          snapshot_date?: string
          snapshot_time?: string
          total_holders?: number | null
          total_volume?: number | null
          transactions_24h?: number | null
          wco_burnt_24h?: number | null
          wco_burnt_total?: number | null
          wco_moved_24h?: number | null
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot_date: string
          snapshot_time: string
          token_holdings: Json
          total_value_usd: number
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_date: string
          snapshot_time?: string
          token_holdings?: Json
          total_value_usd?: number
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_date?: string
          snapshot_time?: string
          token_holdings?: Json
          total_value_usd?: number
          wallet_address?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          created_at: string
          id: string
          og88_price: number | null
          source: string
          timestamp: string
          wave_price: number | null
          wco_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          og88_price?: number | null
          source?: string
          timestamp: string
          wave_price?: number | null
          wco_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          og88_price?: number | null
          source?: string
          timestamp?: string
          wave_price?: number | null
          wco_price?: number | null
        }
        Relationships: []
      }
      wallet_cache_metadata: {
        Row: {
          created_at: string
          id: string
          last_refresh: string
          refresh_status: string
          total_holders: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_refresh?: string
          refresh_status?: string
          total_holders?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_refresh?: string
          refresh_status?: string
          total_holders?: number
        }
        Relationships: []
      }
      wallet_leaderboard_cache: {
        Row: {
          address: string
          balance: number
          category: string
          created_at: string
          emoji: string
          id: string
          is_exchange: boolean
          is_flagship: boolean
          is_wrapped: boolean
          label: string | null
          transaction_count: number
          updated_at: string
        }
        Insert: {
          address: string
          balance: number
          category: string
          created_at?: string
          emoji: string
          id?: string
          is_exchange?: boolean
          is_flagship?: boolean
          is_wrapped?: boolean
          label?: string | null
          transaction_count?: number
          updated_at?: string
        }
        Update: {
          address?: string
          balance?: number
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          is_exchange?: boolean
          is_flagship?: boolean
          is_wrapped?: boolean
          label?: string | null
          transaction_count?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
