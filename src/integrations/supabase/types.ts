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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          category: string | null
          claimed: boolean | null
          commission_rate: number | null
          completion_rate: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          distance: string | null
          eta: string | null
          featured: boolean | null
          id: string
          image: string | null
          is_active: boolean | null
          is_approved: boolean
          is_blocked: boolean | null
          name: string
          online_since: string | null
          owner_email: string | null
          owner_phone: string | null
          owner_user_id: string | null
          ranking_score: number | null
          rating: number | null
          total_orders: number | null
          type: Database["public"]["Enums"]["business_type"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          claimed?: boolean | null
          commission_rate?: number | null
          completion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_approved?: boolean
          is_blocked?: boolean | null
          name: string
          online_since?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          owner_user_id?: string | null
          ranking_score?: number | null
          rating?: number | null
          total_orders?: number | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          claimed?: boolean | null
          commission_rate?: number | null
          completion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_approved?: boolean
          is_blocked?: boolean | null
          name?: string
          online_since?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          owner_user_id?: string | null
          ranking_score?: number | null
          rating?: number | null
          total_orders?: number | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          order_id: string | null
          read_at: string | null
          rider_request_id: string | null
          sender_id: string
          sender_type: string
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          order_id?: string | null
          read_at?: string | null
          rider_request_id?: string | null
          sender_id: string
          sender_type: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          order_id?: string | null
          read_at?: string | null
          rider_request_id?: string | null
          sender_id?: string
          sender_type?: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_rider_request_id_fkey"
            columns: ["rider_request_id"]
            isOneToOne: false
            referencedRelation: "rider_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_text: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          lat: number | null
          lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_text: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_text?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          phone_verified: boolean | null
          profile_image: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profile_image?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profile_image?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_available: boolean | null
          is_popular: boolean | null
          name: string
          price: number
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          name: string
          price: number
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_business_info"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          order_updates: boolean
          promotions: boolean
          rider_messages: boolean
          system_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_updates?: boolean
          promotions?: boolean
          rider_messages?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_updates?: boolean
          promotions?: boolean
          rider_messages?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          rider_request_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          rider_request_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          rider_request_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_rider_request_id_fkey"
            columns: ["rider_request_id"]
            isOneToOne: false
            referencedRelation: "rider_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string | null
          created_at: string
          customer_id: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          eta: string | null
          id: string
          items: Json
          notes: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rider_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          eta?: string | null
          id?: string
          items?: Json
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          eta?: string | null
          id?: string
          items?: Json
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_business_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      public_businesses: {
        Row: {
          category: string | null
          deleted_at: string | null
          description: string | null
          distance: string | null
          eta: string | null
          featured: boolean
          id: string
          image: string | null
          is_active: boolean
          is_approved: boolean
          name: string
          rating: number | null
          type: Database["public"]["Enums"]["business_type"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean
          id: string
          image?: string | null
          is_active?: boolean
          is_approved?: boolean
          name: string
          rating?: number | null
          type: Database["public"]["Enums"]["business_type"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean
          id?: string
          image?: string | null
          is_active?: boolean
          is_approved?: boolean
          name?: string
          rating?: number | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
        }
        Relationships: []
      }
      push_device_tokens: {
        Row: {
          created_at: string
          device_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          action_route: string | null
          failure_count: number | null
          id: string
          message: string
          sent_at: string
          sent_by: string
          success_count: number | null
          target_role: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          action_route?: string | null
          failure_count?: number | null
          id?: string
          message: string
          sent_at?: string
          sent_by: string
          success_count?: number | null
          target_role?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          action_route?: string | null
          failure_count?: number | null
          id?: string
          message?: string
          sent_at?: string
          sent_by?: string
          success_count?: number | null
          target_role?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      rider_payment_settings: {
        Row: {
          base_fee: number
          created_at: string
          id: string
          is_active: boolean | null
          min_payment: number
          per_km_rate: number
          updated_at: string
        }
        Insert: {
          base_fee?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_payment?: number
          per_km_rate?: number
          updated_at?: string
        }
        Update: {
          base_fee?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_payment?: number
          per_km_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      rider_payments: {
        Row: {
          base_fee: number
          bonus: number | null
          calculated_amount: number
          created_at: string
          customer_lat: number | null
          customer_lng: number | null
          distance_km: number
          final_amount: number
          id: string
          order_id: string | null
          penalty: number | null
          per_km_rate: number
          rider_id: string
          rider_lat: number | null
          rider_lng: number | null
          rider_request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          base_fee?: number
          bonus?: number | null
          calculated_amount?: number
          created_at?: string
          customer_lat?: number | null
          customer_lng?: number | null
          distance_km?: number
          final_amount?: number
          id?: string
          order_id?: string | null
          penalty?: number | null
          per_km_rate?: number
          rider_id: string
          rider_lat?: number | null
          rider_lng?: number | null
          rider_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_fee?: number
          bonus?: number | null
          calculated_amount?: number
          created_at?: string
          customer_lat?: number | null
          customer_lng?: number | null
          distance_km?: number
          final_amount?: number
          id?: string
          order_id?: string | null
          penalty?: number | null
          per_km_rate?: number
          rider_id?: string
          rider_lat?: number | null
          rider_lng?: number | null
          rider_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_payments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_payments_rider_request_id_fkey"
            columns: ["rider_request_id"]
            isOneToOne: false
            referencedRelation: "rider_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_requests: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_phone: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          item_description: string | null
          item_image: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          rider_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          item_description?: string | null
          item_image?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          item_description?: string | null
          item_image?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          claimed: boolean | null
          cnic: string | null
          commission_rate: number | null
          created_at: string
          current_location_lat: number | null
          current_location_lng: number | null
          email: string | null
          id: string
          image: string | null
          is_active: boolean | null
          is_blocked: boolean | null
          is_online: boolean | null
          name: string
          phone: string
          rating: number | null
          total_trips: number | null
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          claimed?: boolean | null
          cnic?: string | null
          commission_rate?: number | null
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          email?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_blocked?: boolean | null
          is_online?: boolean | null
          name: string
          phone: string
          rating?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          claimed?: boolean | null
          cnic?: string | null
          commission_rate?: number | null
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          email?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_blocked?: boolean | null
          is_online?: boolean | null
          name?: string
          phone?: string
          rating?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
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
      public_business_info: {
        Row: {
          category: string | null
          description: string | null
          distance: string | null
          eta: string | null
          featured: boolean | null
          id: string | null
          image: string | null
          is_active: boolean | null
          name: string | null
          rating: number | null
          type: Database["public"]["Enums"]["business_type"] | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string | null
          image?: string | null
          is_active?: boolean | null
          name?: string | null
          rating?: number | null
          type?: Database["public"]["Enums"]["business_type"] | null
        }
        Update: {
          category?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string | null
          image?: string | null
          is_active?: boolean | null
          name?: string | null
          rating?: number | null
          type?: Database["public"]["Enums"]["business_type"] | null
        }
        Relationships: []
      }
      public_rider_info: {
        Row: {
          current_location_lat: number | null
          current_location_lng: number | null
          id: string | null
          image: string | null
          is_online: boolean | null
          name: string | null
          rating: number | null
          total_trips: number | null
          vehicle_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_rider: { Args: { _rider_id: string }; Returns: boolean }
      create_notification: {
        Args: {
          _message: string
          _order_id?: string
          _rider_request_id?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      create_rider_payment: {
        Args: { _order_id?: string; _rider_request_id?: string }
        Returns: string
      }
      get_all_riders_for_map: {
        Args: never
        Returns: {
          current_location_lat: number
          current_location_lng: number
          id: string
          image: string
          is_active: boolean
          is_online: boolean
          name: string
          rating: number
          total_trips: number
          vehicle_type: string
        }[]
      }
      get_online_riders: {
        Args: never
        Returns: {
          current_location_lat: number
          current_location_lng: number
          id: string
          image: string
          is_online: boolean
          name: string
          rating: number
          total_trips: number
          vehicle_type: string
        }[]
      }
      get_rider_public_info: {
        Args: { rider_uuid: string }
        Returns: {
          current_location_lat: number
          current_location_lng: number
          id: string
          image: string
          is_online: boolean
          name: string
          rating: number
          total_trips: number
          vehicle_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_user_by_phone: {
        Args: { _phone: string; _user_id: string }
        Returns: undefined
      }
      normalize_pk_phone_digits: { Args: { _phone: string }; Returns: string }
      resolve_role_by_email: {
        Args: { _email: string }
        Returns: {
          is_blocked: boolean
          role: string
        }[]
      }
      resolve_role_by_phone: {
        Args: { _phone: string }
        Returns: {
          is_blocked: boolean
          role: string
        }[]
      }
      send_system_notification: {
        Args: { _message: string; _title: string; _user_ids?: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "business"
        | "rider"
        | "customer"
      business_type: "restaurant" | "bakery" | "grocery" | "shop"
      order_status:
        | "placed"
        | "preparing"
        | "on_way"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user", "business", "rider", "customer"],
      business_type: ["restaurant", "bakery", "grocery", "shop"],
      order_status: ["placed", "preparing", "on_way", "delivered", "cancelled"],
    },
  },
} as const
