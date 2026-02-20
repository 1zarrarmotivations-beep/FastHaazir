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
      admin_presence: {
        Row: {
          admin_id: string
          last_active_at: string | null
          status: string | null
        }
        Insert: {
          admin_id: string
          last_active_at?: string | null
          status?: string | null
        }
        Update: {
          admin_id?: string
          last_active_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_presence_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_super: boolean | null
          name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_super?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_super?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_active_users: {
        Row: {
          created_at: string | null
          current_page: string | null
          last_seen: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_page?: string | null
          last_seen?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_page?: string | null
          last_seen?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_active_users_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_active_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      analytics_conversions: {
        Row: {
          conversion_type: string | null
          conversion_value: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          conversion_type?: string | null
          conversion_value?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversion_type?: string | null
          conversion_value?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_conversions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_conversions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_errors: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          error_type: string | null
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          error_type?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          error_type?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_errors_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_category: string | null
          event_label: string | null
          event_name: string | null
          event_value: number | null
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_category?: string | null
          event_label?: string | null
          event_name?: string | null
          event_value?: number | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_category?: string | null
          event_label?: string | null
          event_name?: string | null
          event_value?: number | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_page_views: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          duration_seconds: number | null
          id: string
          os: string | null
          page_path: string | null
          page_title: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          os?: string | null
          page_path?: string | null
          page_title?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          os?: string | null
          page_path?: string | null
          page_title?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          entry_page: string | null
          exit_page: string | null
          id: string
          is_active: boolean | null
          os: string | null
          referrer_url: string | null
          session_end: string | null
          total_duration_seconds: number | null
          total_pages_viewed: number | null
          traffic_source: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id: string
          is_active?: boolean | null
          os?: string | null
          referrer_url?: string | null
          session_end?: string | null
          total_duration_seconds?: number | null
          total_pages_viewed?: number | null
          traffic_source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_active?: boolean | null
          os?: string | null
          referrer_url?: string | null
          session_end?: string | null
          total_duration_seconds?: number | null
          total_pages_viewed?: number | null
          traffic_source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      anomaly_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auto_reply_templates: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          reply_en: string
          reply_ur: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          reply_en: string
          reply_ur: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          reply_en?: string
          reply_ur?: string
        }
        Relationships: []
      }
      business_rating_stats: {
        Row: {
          average_rating: number | null
          business_id: string
          rating_1_count: number | null
          rating_2_count: number | null
          rating_3_count: number | null
          rating_4_count: number | null
          rating_5_count: number | null
          top_negative_tags: string[] | null
          top_positive_tags: string[] | null
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          business_id: string
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          top_negative_tags?: string[] | null
          top_positive_tags?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          business_id?: string
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          top_negative_tags?: string[] | null
          top_positive_tags?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_rating_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_rating_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          claimed: boolean | null
          commission_rate: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          distance: string | null
          eta: string | null
          featured: boolean | null
          id: string
          image: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_busy: boolean | null
          latitude: number | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          longitude: number | null
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_user_id: string | null
          phone: string | null
          rating: number | null
          total_ratings: number | null
          type: string
          update_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          claimed?: boolean | null
          commission_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_busy?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          longitude?: number | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_user_id?: string | null
          phone?: string | null
          rating?: number | null
          total_ratings?: number | null
          type?: string
          update_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          claimed?: boolean | null
          commission_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_busy?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          longitude?: number | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_user_id?: string | null
          phone?: string | null
          rating?: number | null
          total_ratings?: number | null
          type?: string
          update_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          availability_schedule: Json | null
          business_id: string
          created_at: string
          deleted_at: string | null
          depth_level: number | null
          description: string | null
          description_ur: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_locked: boolean
          metadata: Json | null
          name: string
          name_ur: string | null
          parent_id: string | null
          path: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          availability_schedule?: Json | null
          business_id: string
          created_at?: string
          deleted_at?: string | null
          depth_level?: number | null
          description?: string | null
          description_ur?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_locked?: boolean
          metadata?: Json | null
          name: string
          name_ur?: string | null
          parent_id?: string | null
          path?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          availability_schedule?: Json | null
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          depth_level?: number | null
          description?: string | null
          description_ur?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_locked?: boolean
          metadata?: Json | null
          name?: string
          name_ur?: string | null
          parent_id?: string | null
          path?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      category_pricing: {
        Row: {
          base_fee: number
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          min_payment: number
          per_km_rate: number
          updated_at: string | null
        }
        Insert: {
          base_fee?: number
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_payment?: number
          per_km_rate?: number
          updated_at?: string | null
        }
        Update: {
          base_fee?: number
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_payment?: number
          per_km_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          message_type: string | null
          order_id: string | null
          read_at: string | null
          rider_request_id: string | null
          sender_id: string | null
          sender_type: string | null
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          message_type?: string | null
          order_id?: string | null
          read_at?: string | null
          rider_request_id?: string | null
          sender_id?: string | null
          sender_type?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          message_type?: string | null
          order_id?: string | null
          read_at?: string | null
          rider_request_id?: string | null
          sender_id?: string | null
          sender_type?: string | null
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
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_text: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          lat: number | null
          lng: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_text: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          lat?: number | null
          lng?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_text?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          lat?: number | null
          lng?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_deletion_pending: boolean | null
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
          is_deletion_pending?: boolean | null
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
          is_deletion_pending?: boolean | null
          name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profile_image?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      distance_cache: {
        Row: {
          calculated_at: string | null
          distance_km: number
          dropoff_lat: number
          dropoff_lng: number
          duration_mins: number
          id: string
          pickup_lat: number
          pickup_lng: number
        }
        Insert: {
          calculated_at?: string | null
          distance_km: number
          dropoff_lat: number
          dropoff_lng: number
          duration_mins: number
          id?: string
          pickup_lat: number
          pickup_lng: number
        }
        Update: {
          calculated_at?: string | null
          distance_km?: number
          dropoff_lat?: number
          dropoff_lng?: number
          duration_mins?: number
          id?: string
          pickup_lat?: number
          pickup_lng?: number
        }
        Relationships: []
      }
      fare_quotes: {
        Row: {
          breakdown: Json
          created_at: string | null
          distance_km: number
          estimated_fare: number
          id: string
          service_type: string
          surge_multiplier: number | null
          used_for_order_id: string | null
          valid_until: string
        }
        Insert: {
          breakdown: Json
          created_at?: string | null
          distance_km: number
          estimated_fare: number
          id?: string
          service_type: string
          surge_multiplier?: number | null
          used_for_order_id?: string | null
          valid_until: string
        }
        Update: {
          breakdown?: Json
          created_at?: string | null
          distance_km?: number
          estimated_fare?: number
          id?: string
          service_type?: string
          surge_multiplier?: number | null
          used_for_order_id?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      "fast haazir": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          business_id: string | null
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_available: boolean | null
          is_deleted: boolean | null
          is_draft: boolean | null
          is_popular: boolean | null
          name: string
          original_price: number | null
          price: number
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_deleted?: boolean | null
          is_draft?: boolean | null
          is_popular?: boolean | null
          name: string
          original_price?: number | null
          price: number
        }
        Update: {
          business_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_deleted?: boolean | null
          is_draft?: boolean | null
          is_popular?: boolean | null
          name?: string
          original_price?: number | null
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
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      menu_upload_drafts: {
        Row: {
          business_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          id: string
          items: Json
          published_at: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          items?: Json
          published_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          items?: Json
          published_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_upload_drafts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          rider_request_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          rider_request_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          rider_request_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
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
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_heatmap_hourly: {
        Row: {
          hour_timestamp: string
          id: string
          lat: number
          lng: number
          location_type: string | null
          order_count: number
        }
        Insert: {
          hour_timestamp: string
          id?: string
          lat: number
          lng: number
          location_type?: string | null
          order_count?: number
        }
        Update: {
          hour_timestamp?: string
          id?: string
          lat?: number
          lng?: number
          location_type?: string | null
          order_count?: number
        }
        Relationships: []
      }
      order_ratings: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_verified: boolean | null
          order_id: string
          restaurant_rating: number | null
          restaurant_review: string | null
          restaurant_tags: string[] | null
          rider_id: string | null
          rider_rating: number | null
          rider_review: string | null
          rider_tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_verified?: boolean | null
          order_id: string
          restaurant_rating?: number | null
          restaurant_review?: string | null
          restaurant_tags?: string[] | null
          rider_id?: string | null
          rider_rating?: number | null
          rider_review?: string | null
          rider_tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_verified?: boolean | null
          order_id?: string
          restaurant_rating?: number | null
          restaurant_review?: string | null
          restaurant_tags?: string[] | null
          rider_id?: string | null
          rider_rating?: number | null
          rider_review?: string | null
          rider_tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_fare: number | null
          assigned_at: string | null
          business_id: string | null
          commission: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_otp: string | null
          distance_km: number | null
          estimated_fare: number | null
          eta: string | null
          fare_locked_at: string | null
          fare_quote_id: string | null
          id: string
          is_rated: boolean | null
          items: Json | null
          otp_verified: boolean | null
          payment_status: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rated_at: string | null
          rejection_reason: string | null
          rider_earning: number | null
          rider_id: string | null
          service_type: string | null
          status: string | null
          subtotal: number | null
          surge_multiplier: number | null
          total: number | null
          total_amount: number | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          actual_fare?: number | null
          assigned_at?: string | null
          business_id?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_otp?: string | null
          distance_km?: number | null
          estimated_fare?: number | null
          eta?: string | null
          fare_locked_at?: string | null
          fare_quote_id?: string | null
          id?: string
          is_rated?: boolean | null
          items?: Json | null
          otp_verified?: boolean | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rated_at?: string | null
          rejection_reason?: string | null
          rider_earning?: number | null
          rider_id?: string | null
          service_type?: string | null
          status?: string | null
          subtotal?: number | null
          surge_multiplier?: number | null
          total?: number | null
          total_amount?: number | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          actual_fare?: number | null
          assigned_at?: string | null
          business_id?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_otp?: string | null
          distance_km?: number | null
          estimated_fare?: number | null
          eta?: string | null
          fare_locked_at?: string | null
          fare_quote_id?: string | null
          id?: string
          is_rated?: boolean | null
          items?: Json | null
          otp_verified?: boolean | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rated_at?: string | null
          rejection_reason?: string | null
          rider_earning?: number | null
          rider_id?: string | null
          service_type?: string | null
          status?: string | null
          subtotal?: number | null
          surge_multiplier?: number | null
          total?: number | null
          total_amount?: number | null
          updated_at?: string | null
          zone?: string | null
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
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_customer_profiles_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_fare_quote_id_fkey"
            columns: ["fare_quote_id"]
            isOneToOne: false
            referencedRelation: "fare_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_info"
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
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_by_name: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          payment_method: string | null
          payment_status: string | null
          payment_url: string | null
          proof_url: string | null
          external_transaction_id: string | null
          qr_url: string | null
          rider_request_id: string | null
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_by_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payment_url?: string | null
          proof_url?: string | null
          external_transaction_id?: string | null
          qr_url?: string | null
          rider_request_id?: string | null
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_by_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payment_url?: string | null
          proof_url?: string | null
          external_transaction_id?: string | null
          qr_url?: string | null
          rider_request_id?: string | null
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rider_request_id_fkey"
            columns: ["rider_request_id"]
            isOneToOne: false
            referencedRelation: "rider_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          base_distance_km: number
          base_fare: number
          id: string
          is_active: boolean | null
          minimum_fare: number
          minimum_rider_earning: number | null
          per_km_rate: number
          per_min_rate: number
          rider_commission_type: string | null
          rider_commission_value: number | null
          rider_per_km_rate: number | null
          service_type: string
          updated_at: string | null
        }
        Insert: {
          base_distance_km?: number
          base_fare?: number
          id?: string
          is_active?: boolean | null
          minimum_fare?: number
          minimum_rider_earning?: number | null
          per_km_rate?: number
          per_min_rate?: number
          rider_commission_type?: string | null
          rider_commission_value?: number | null
          rider_per_km_rate?: number | null
          service_type: string
          updated_at?: string | null
        }
        Update: {
          base_distance_km?: number
          base_fare?: number
          id?: string
          is_active?: boolean | null
          minimum_fare?: number
          minimum_rider_earning?: number | null
          per_km_rate?: number
          per_min_rate?: number
          rider_commission_type?: string | null
          rider_commission_value?: number | null
          rider_per_km_rate?: number | null
          service_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          category_specific_metadata: Json | null
          category_specific_price: number | null
          created_at: string
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          category_specific_metadata?: Json | null
          category_specific_price?: number | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          category_specific_metadata?: Json | null
          category_specific_price?: number | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          }
        ]
      }
      product_rating_stats: {
        Row: {
          average_presentation: number | null
          average_quality: number | null
          average_rating: number | null
          average_value: number | null
          business_id: string
          id: string
          last_ordered_at: string | null
          product_name: string
          rating_1_count: number | null
          rating_2_count: number | null
          rating_3_count: number | null
          rating_4_count: number | null
          rating_5_count: number | null
          top_negative_tags: string[] | null
          top_positive_tags: string[] | null
          total_orders: number | null
          total_ratings: number | null
          updated_at: string | null
          would_order_again_percentage: number | null
        }
        Insert: {
          average_presentation?: number | null
          average_quality?: number | null
          average_rating?: number | null
          average_value?: number | null
          business_id: string
          id?: string
          last_ordered_at?: string | null
          product_name: string
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          top_negative_tags?: string[] | null
          top_positive_tags?: string[] | null
          total_orders?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          would_order_again_percentage?: number | null
        }
        Update: {
          average_presentation?: number | null
          average_quality?: number | null
          average_rating?: number | null
          average_value?: number | null
          business_id?: string
          id?: string
          last_ordered_at?: string | null
          product_name?: string
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          top_negative_tags?: string[] | null
          top_positive_tags?: string[] | null
          total_orders?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          would_order_again_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_rating_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string
          helpful_count: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_verified: boolean | null
          order_id: string
          presentation_rating: number | null
          product_category: string | null
          product_name: string
          quality_rating: number | null
          rating: number
          review: string | null
          tags: string[] | null
          updated_at: string | null
          value_rating: number | null
          would_order_again: boolean | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id: string
          helpful_count?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          order_id: string
          presentation_rating?: number | null
          product_category?: string | null
          product_name: string
          quality_rating?: number | null
          rating: number
          review?: string | null
          tags?: string[] | null
          updated_at?: string | null
          value_rating?: number | null
          would_order_again?: boolean | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string
          helpful_count?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          order_id?: string
          presentation_rating?: number | null
          product_category?: string | null
          product_name?: string
          quality_rating?: number | null
          rating?: number
          review?: string | null
          tags?: string[] | null
          updated_at?: string | null
          value_rating?: number | null
          would_order_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_banners: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          image_url: string
          location: 'home' | 'category'
          category_id: string | null
          style_config: Json | null
          action_type: 'link' | 'store' | 'product'
          action_value: string | null
          is_active: boolean
          display_order: number
          start_date: string | null
          end_date: string | null

          // Legacy Compatibility
          background_type: string | null
          background_value: string | null
          business_id: string | null
          button_text_en: string | null
          button_text_ur: string | null
          click_action: string | null
          created_at: string
          description_en: string | null
          description_ur: string | null
          external_url: string | null
          heading_en: string | null
          heading_ur: string | null
          icon: string | null
          subtitle_en: string | null
          subtitle_ur: string | null
        }
        Insert: {
          id?: string
          title?: string
          subtitle?: string | null
          image_url?: string
          location?: 'home' | 'category'
          category_id?: string | null
          style_config?: Json | null
          action_type?: 'link' | 'store' | 'product'
          action_value?: string | null
          is_active?: boolean
          display_order?: number
          start_date?: string | null
          end_date?: string | null

          // Legacy Compatibility
          background_type?: string | null
          background_value?: string | null
          business_id?: string | null
          button_text_en?: string | null
          button_text_ur?: string | null
          click_action?: string | null
          created_at?: string
          description_en?: string | null
          description_ur?: string | null
          external_url?: string | null
          heading_en?: string | null
          heading_ur?: string | null
          icon?: string | null
          subtitle_en?: string | null
          subtitle_ur?: string | null
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          image_url?: string
          location?: 'home' | 'category'
          category_id?: string | null
          style_config?: Json | null
          action_type?: 'link' | 'store' | 'product'
          action_value?: string | null
          is_active?: boolean
          display_order?: number
          start_date?: string | null
          end_date?: string | null

          // Legacy Compatibility
          background_type?: string | null
          background_value?: string | null
          business_id?: string | null
          button_text_en?: string | null
          button_text_ur?: string | null
          click_action?: string | null
          created_at?: string
          description_en?: string | null
          description_ur?: string | null
          external_url?: string | null
          heading_en?: string | null
          heading_ur?: string | null
          icon?: string | null
          subtitle_en?: string | null
          subtitle_ur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_payment_settings: {
        Row: {
          base_fee: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_delivery_radius_km: number | null
          min_order_value: number | null
          min_payment: number | null
          per_km_rate: number | null
          rider_base_earning: number | null
          updated_at: string | null
        }
        Insert: {
          base_fee?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_delivery_radius_km?: number | null
          min_order_value?: number | null
          min_payment?: number | null
          per_km_rate?: number | null
          rider_base_earning?: number | null
          updated_at?: string | null
        }
        Update: {
          base_fee?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_delivery_radius_km?: number | null
          min_order_value?: number | null
          min_payment?: number | null
          per_km_rate?: number | null
          rider_base_earning?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rider_payments: {
        Row: {
          amount: number
          base_fee: number | null
          calculated_amount: number | null
          created_at: string | null
          customer_lat: number | null
          customer_lng: number | null
          distance_km: number | null
          final_amount: number | null
          id: string
          order_id: string | null
          per_km_rate: number | null
          rider_id: string | null
          rider_lat: number | null
          rider_lng: number | null
          rider_request_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          base_fee?: number | null
          calculated_amount?: number | null
          created_at?: string | null
          customer_lat?: number | null
          customer_lng?: number | null
          distance_km?: number | null
          final_amount?: number | null
          id?: string
          order_id?: string | null
          per_km_rate?: number | null
          rider_id?: string | null
          rider_lat?: number | null
          rider_lng?: number | null
          rider_request_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          base_fee?: number | null
          calculated_amount?: number | null
          created_at?: string | null
          customer_lat?: number | null
          customer_lng?: number | null
          distance_km?: number | null
          final_amount?: number | null
          id?: string
          order_id?: string | null
          per_km_rate?: number | null
          rider_id?: string | null
          rider_lat?: number | null
          rider_lng?: number | null
          rider_request_id?: string | null
          status?: string | null
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
            referencedRelation: "public_rider_info"
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
      rider_performance_daily: {
        Row: {
          avg_delivery_time_mins: number | null
          avg_rating: number | null
          bonus_earned: number
          date: string
          id: string
          orders_completed: number
          rider_id: string
          total_distance_km: number
          total_earnings: number
        }
        Insert: {
          avg_delivery_time_mins?: number | null
          avg_rating?: number | null
          bonus_earned?: number
          date: string
          id?: string
          orders_completed?: number
          rider_id: string
          total_distance_km?: number
          total_earnings?: number
        }
        Update: {
          avg_delivery_time_mins?: number | null
          avg_rating?: number | null
          bonus_earned?: number
          date?: string
          id?: string
          orders_completed?: number
          rider_id?: string
          total_distance_km?: number
          total_earnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "rider_performance_daily_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_performance_daily_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_rating_stats: {
        Row: {
          acceptance_rate: number | null
          average_rating: number | null
          on_time_percentage: number | null
          rating_1_count: number | null
          rating_2_count: number | null
          rating_3_count: number | null
          rating_4_count: number | null
          rating_5_count: number | null
          rider_id: string
          top_negative_tags: string[] | null
          top_positive_tags: string[] | null
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          average_rating?: number | null
          on_time_percentage?: number | null
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          rider_id: string
          top_negative_tags?: string[] | null
          top_positive_tags?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          average_rating?: number | null
          on_time_percentage?: number | null
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          rider_id?: string
          top_negative_tags?: string[] | null
          top_positive_tags?: string[] | null
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_rating_stats_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_rating_stats_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_requests: {
        Row: {
          commission: number | null
          created_at: string | null
          customer_id: string | null
          customer_phone: string | null
          delivery_otp: string | null
          distance_km: number | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          item_description: string | null
          order_id: string | null
          otp_verified: boolean | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rider_earning: number | null
          rider_id: string | null
          status: string | null
          total: number | null
        }
        Insert: {
          commission?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          delivery_otp?: string | null
          distance_km?: number | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          item_description?: string | null
          order_id?: string | null
          otp_verified?: boolean | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_earning?: number | null
          rider_id?: string | null
          status?: string | null
          total?: number | null
        }
        Update: {
          commission?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          delivery_otp?: string | null
          distance_km?: number | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          item_description?: string | null
          order_id?: string | null
          otp_verified?: boolean | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_earning?: number | null
          rider_id?: string | null
          status?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rider_requests_customer_profiles_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rider_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_support_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "rider_support_tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      rider_support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          priority: string
          rider_id: string
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          priority?: string
          rider_id: string
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          priority?: string
          rider_id?: string
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rider_wallet_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          linked_order_id: string | null
          linked_rider_request_id: string | null
          reason: string
          rider_id: string
          settled_at: string | null
          settled_by: string | null
          settled_notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          adjustment_type: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          linked_order_id?: string | null
          linked_rider_request_id?: string | null
          reason: string
          rider_id: string
          settled_at?: string | null
          settled_by?: string | null
          settled_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          adjustment_type?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          linked_order_id?: string | null
          linked_rider_request_id?: string | null
          reason?: string
          rider_id?: string
          settled_at?: string | null
          settled_by?: string | null
          settled_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_wallet_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rider_wallet_adjustments_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_wallet_adjustments_linked_rider_request_id_fkey"
            columns: ["linked_rider_request_id"]
            isOneToOne: false
            referencedRelation: "rider_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_wallet_adjustments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_wallet_adjustments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_wallet_adjustments_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rider_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          rider_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          rider_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          rider_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_wallets_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_wallets_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      riders: {
        Row: {
          address: string | null
          city: string | null
          cnic: string | null
          cnic_back: string | null
          cnic_front: string | null
          commission_rate: number | null
          created_at: string | null
          current_location_lat: number | null
          current_location_lng: number | null
          current_speed: number | null
          email: string | null
          id: string
          image: string | null
          is_active: boolean | null
          is_online: boolean | null
          last_online_at: string | null
          license_image: string | null
          name: string | null
          phone: string | null
          rating: number | null
          total_ratings: number | null
          total_trips: number | null
          user_id: string | null
          vehicle_type: string | null
          verification_status: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnic?: string | null
          cnic_back?: string | null
          cnic_front?: string | null
          commission_rate?: number | null
          created_at?: string | null
          current_location_lat?: number | null
          current_location_lng?: number | null
          current_speed?: number | null
          email?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          last_online_at?: string | null
          license_image?: string | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          total_ratings?: number | null
          total_trips?: number | null
          user_id?: string | null
          vehicle_type?: string | null
          verification_status?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnic?: string | null
          cnic_back?: string | null
          cnic_front?: string | null
          commission_rate?: number | null
          created_at?: string | null
          current_location_lat?: number | null
          current_location_lng?: number | null
          current_speed?: number | null
          email?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          last_online_at?: string | null
          license_image?: string | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          total_ratings?: number | null
          total_trips?: number | null
          user_id?: string | null
          vehicle_type?: string | null
          verification_status?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          is_system: boolean | null
          message: string
          read_at: string | null
          sender_id: string | null
          ticket_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          is_system?: boolean | null
          message: string
          read_at?: string | null
          sender_id?: string | null
          ticket_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          is_system?: boolean | null
          message?: string
          read_at?: string | null
          sender_id?: string | null
          ticket_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "admin_support_tickets_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          order_id: string | null
          priority: string | null
          status: string
          subject: string | null
          unanswered_count: number | null
          updated_at: string | null
          user_id: string
          user_type: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          order_id?: string | null
          priority?: string | null
          status?: string
          subject?: string | null
          unanswered_count?: number | null
          updated_at?: string | null
          user_id: string
          user_type?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          order_id?: string | null
          priority?: string | null
          status?: string
          subject?: string | null
          unanswered_count?: number | null
          updated_at?: string | null
          user_id?: string
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      surge_pricing_rules: {
        Row: {
          active_days: string[] | null
          condition_type: string | null
          created_at: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          min_demand_ratio: number | null
          multiplier: number
          start_time: string | null
          updated_at: string | null
          zone_bounds: Json | null
          zone_name: string
        }
        Insert: {
          active_days?: string[] | null
          condition_type?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          min_demand_ratio?: number | null
          multiplier?: number
          start_time?: string | null
          updated_at?: string | null
          zone_bounds?: Json | null
          zone_name: string
        }
        Update: {
          active_days?: string[] | null
          condition_type?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          min_demand_ratio?: number | null
          multiplier?: number
          start_time?: string | null
          updated_at?: string | null
          zone_bounds?: Json | null
          zone_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number | null
          created_at: string | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          processed_at: string | null
          processed_by: string | null
          rider_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rider_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rider_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      },
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      },
      rider_applications: {
        Row: {
          approved_by: string | null
          created_at: string
          experience_years: number | null
          id: string
          license_number: string | null
          notes: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          license_number?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          license_number?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      active_promo_banners: {
        Row: {
          background_type: string | null
          background_value: string | null
          business_id: string | null
          button_text_en: string | null
          button_text_ur: string | null
          click_action: string | null
          created_at: string | null
          description_en: string | null
          description_ur: string | null
          display_order: number | null
          end_date: string | null
          heading_en: string | null
          heading_ur: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          start_date: string | null
          subtitle_en: string | null
          subtitle_ur: string | null
        }
        Insert: {
          background_type?: string | null
          background_value?: string | null
          business_id?: string | null
          button_text_en?: string | null
          button_text_ur?: string | null
          click_action?: string | null
          created_at?: string | null
          description_en?: string | null
          description_ur?: string | null
          display_order?: number | null
          end_date?: string | null
          heading_en?: string | null
          heading_ur?: string | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          start_date?: string | null
          subtitle_en?: string | null
          subtitle_ur?: string | null
        }
        Update: {
          background_type?: string | null
          background_value?: string | null
          business_id?: string | null
          button_text_en?: string | null
          button_text_ur?: string | null
          click_action?: string | null
          created_at?: string | null
          description_en?: string | null
          description_ur?: string | null
          display_order?: number | null
          end_date?: string | null
          heading_en?: string | null
          heading_ur?: string | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          start_date?: string | null
          subtitle_en?: string | null
          subtitle_ur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_support_tickets_view: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          id: string | null
          last_message_at: string | null
          metadata: Json | null
          order_created_at: string | null
          order_id: string | null
          order_status: string | null
          order_total: number | null
          priority: string | null
          status: string | null
          subject: string | null
          unanswered_count: number | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
          user_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_role_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_businesses: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          distance: string | null
          eta: string | null
          featured: boolean | null
          id: string | null
          image: string | null
          is_active: boolean | null
          is_approved: boolean | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          name: string | null
          rating: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string | null
          image?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string | null
          rating?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          distance?: string | null
          eta?: string | null
          featured?: boolean | null
          id?: string | null
          image?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string | null
          rating?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_rider_info: {
        Row: {
          current_location_lat: number | null
          current_location_lng: number | null
          current_speed: number | null
          id: string | null
          image: string | null
          is_online: boolean | null
          name: string | null
          rating: number | null
          total_trips: number | null
          vehicle_type: string | null
        }
        Insert: {
          current_location_lat?: number | null
          current_location_lng?: number | null
          current_speed?: number | null
          id?: string | null
          image?: string | null
          is_online?: boolean | null
          name?: string | null
          rating?: number | null
          total_trips?: number | null
          vehicle_type?: string | null
        }
        Update: {
          current_location_lat?: number | null
          current_location_lng?: number | null
          current_speed?: number | null
          id?: string | null
          image?: string | null
          is_online?: boolean | null
          name?: string | null
          rating?: number | null
          total_trips?: number | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      user_role_debug: {
        Row: {
          admin_active: boolean | null
          effective_role: string | null
          email: string | null
          is_admin_record: boolean | null
          is_rider_record: boolean | null
          phone: string | null
          rider_active: boolean | null
          status: string | null
          user_id: string | null
          user_roles: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_wallet: {
        Args: { p_amount: number; p_description?: string; p_rider_id: string }
        Returns: Json
      }
      admin_delete_order: { Args: { p_order_id: string }; Returns: undefined }
      admin_delete_rating: {
        Args: { p_rating_id: string; p_rating_type?: string }
        Returns: undefined
      }
      admin_get_complete_user_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_get_user_session_info: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_override_order_status: {
        Args: { p_new_status: string; p_order_id: string }
        Returns: undefined
      }
      admin_toggle_business_status: {
        Args: { p_business_id: string; p_is_active: boolean }
        Returns: undefined
      }
      admin_toggle_rider_status: {
        Args: { p_is_active: boolean; p_rider_id: string }
        Returns: undefined
      }
      admin_update_pricing: {
        Args: {
          p_base_fare?: number
          p_minimum_fare?: number
          p_per_km_rate?: number
          p_rider_per_km_rate?: number
          p_service_type: string
        }
        Returns: undefined
      }
      calculate_bounce_rate: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      calculate_customer_fare: {
        Args: { p_distance_km: number; p_service_type: string; p_zone?: string }
        Returns: Json
      }
      calculate_rider_earning: {
        Args: {
          p_daily_orders?: number
          p_distance_km: number
          p_service_type: string
          p_tip?: number
        }
        Returns: Json
      }
      calculate_surge_multiplier: {
        Args: { p_service_type: string; p_timestamp?: string; p_zone: string }
        Returns: number
      }
      check_and_create_rating_alerts: { Args: never; Returns: undefined }
      cleanup_offline_admins: { Args: never; Returns: undefined }
      complete_order_and_update_wallet: {
        Args: { p_order_id: string; p_rider_id: string; p_tip?: number }
        Returns: Json
      }
      create_notification: {
        Args: {
          _message: string
          _order_id?: string
          _rider_request_id?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      create_rider_payment: {
        Args: { _order_id?: string; _rider_request_id?: string }
        Returns: string
      }
      detect_and_log_anomalies: { Args: never; Returns: undefined }
      get_all_riders_for_map: {
        Args: never
        Returns: {
          current_location_lat: number | null
          current_location_lng: number | null
          current_speed: number | null
          id: string | null
          image: string | null
          is_active: boolean | null
          is_online: boolean | null
          name: string | null
          rating: number | null
          total_trips: number | null
          vehicle_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_rider_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_customer_product_ratings: {
        Args: { p_customer_id: string }
        Returns: {
          business_name: string
          created_at: string
          product_name: string
          rating: number
          review: string
        }[]
      }
      get_low_rated_products: {
        Args: { p_min_ratings?: number; p_threshold?: number }
        Returns: {
          average_rating: number
          business_id: string
          business_name: string
          product_name: string
          status: string
          top_negative_tags: string[]
          total_ratings: number
          would_order_again_pct: number
        }[]
      }
      get_low_rated_restaurants: {
        Args: { p_min_ratings?: number; p_threshold?: number }
        Returns: {
          average_rating: number
          business_id: string
          business_name: string
          category: string
          last_poor_rating_date: string
          recent_poor_ratings: number
          status: string
          total_ratings: number
        }[]
      }
      get_low_rated_riders: {
        Args: { p_min_ratings?: number; p_threshold?: number }
        Returns: {
          average_rating: number
          last_poor_rating_date: string
          recent_poor_ratings: number
          rider_id: string
          rider_name: string
          rider_phone: string
          status: string
          total_ratings: number
        }[]
      }
      get_my_role: {
        Args: never
        Returns: {
          is_blocked: boolean
          needs_registration: boolean
          role: string
        }[]
      }
      get_online_riders: {
        Args: never
        Returns: {
          current_location_lat: number | null
          current_location_lng: number | null
          current_speed: number | null
          id: string | null
          image: string | null
          is_online: boolean | null
          name: string | null
          rating: number | null
          total_trips: number | null
          vehicle_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_rider_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_product_rating_details: {
        Args: { p_business_id: string; p_product_name: string }
        Returns: Json
      }
      get_rating_dashboard_stats: { Args: never; Returns: Json }
      get_rating_distribution: {
        Args: { p_entity_type?: string }
        Returns: Json
      }
      get_rating_trends_daily: {
        Args: { p_days?: number }
        Returns: {
          avg_product_rating: number
          avg_restaurant_rating: number
          avg_rider_rating: number
          date: string
          total_orders_rated: number
          total_ratings: number
        }[]
      }
      get_realtime_order_metrics: { Args: { p_period?: string }; Returns: Json }
      get_restaurant_rating_details: {
        Args: { p_business_id: string }
        Returns: Json
      }
      get_reviews_for_moderation: {
        Args: never
        Returns: {
          created_at: string
          entity_name: string
          helpful_count: number
          order_id: string
          rating: number
          reason: string
          review_id: string
          review_text: string
          review_type: string
          reviewer_id: string
        }[]
      }
      get_rider_public_info: {
        Args: { rider_uuid: string }
        Returns: {
          current_location_lat: number | null
          current_location_lng: number | null
          current_speed: number | null
          id: string | null
          image: string | null
          is_online: boolean | null
          name: string | null
          rating: number | null
          total_trips: number | null
          vehicle_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_rider_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_rider_rating_details: { Args: { p_rider_id: string }; Returns: Json }
      get_top_pages: {
        Args: { end_date: string; limit_count: number; start_date: string }
        Returns: {
          avg_duration: number
          page_path: string
          unique_visitors: number
          view_count: number
        }[]
      }
      get_top_performers_this_month: { Args: never; Returns: Json }
      get_top_products_by_restaurant: {
        Args: { p_business_id: string; p_limit?: number }
        Returns: {
          average_rating: number
          product_name: string
          total_ratings: number
          would_order_again_pct: number
        }[]
      }
      get_top_products_global: {
        Args: { p_limit?: number }
        Returns: {
          average_rating: number
          business_id: string
          business_name: string
          product_name: string
          total_ratings: number
        }[]
      }
      get_top_rated_restaurants: {
        Args: { p_limit?: number }
        Returns: {
          business_id: string
          category: string
          name: string
          rating: number
          total_ratings: number
        }[]
      }
      get_top_rated_riders: {
        Args: { p_limit?: number }
        Returns: {
          name: string
          phone: string
          rating: number
          rider_id: string
          total_orders: number
          total_ratings: number
        }[]
      }
      get_traffic_sources: {
        Args: { end_date: string; start_date: string }
        Returns: {
          percentage: number
          session_count: number
          traffic_source: string
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment: { Args: never; Returns: number }
      increment_session_duration: {
        Args: { p_duration: number; p_session_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      mark_review_helpful: { Args: { p_rating_id: string }; Returns: undefined }
      normalize_pk_phone_digits: { Args: { phone: string }; Returns: string }
      process_cash_collection: {
        Args: { p_cash_amount: number; p_order_id: string; p_rider_id: string }
        Returns: undefined
      }
      process_ride_payment: {
        Args: {
          p_amount: number
          p_category?: string
          p_order_id: string
          p_rider_id: string
        }
        Returns: undefined
      }
      process_weekly_bonuses: { Args: never; Returns: undefined }
      register_rider: {
        Args: {
          _cnic?: string
          _cnic_back?: string
          _cnic_front?: string
          _license_image?: string
          _name: string
          _phone: string
          _vehicle_type: string
        }
        Returns: Json
      }
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
        Args: {
          _title: string
          _message: string
          _user_ids?: string[] | null
          _type?: string
          _data?: Json
        }
        Returns: undefined
      }
      set_default_customer_address:
      | { Args: { p_address_id: string }; Returns: undefined }
      | {
        Args: { p_address_id: string; p_user_id: string }
        Returns: undefined
      }
      submit_order_rating: {
        Args: {
          p_customer_id: string
          p_order_id: string
          p_restaurant_rating?: number
          p_restaurant_review?: string
          p_restaurant_tags?: string[]
          p_rider_rating?: number
          p_rider_review?: string
          p_rider_tags?: string[]
        }
        Returns: Json
      }
      submit_product_rating: {
        Args: {
          p_customer_id: string
          p_image_url?: string
          p_order_id: string
          p_presentation_rating?: number
          p_product_name: string
          p_quality_rating?: number
          p_rating: number
          p_review?: string
          p_tags?: string[]
          p_value_rating?: number
          p_would_order_again?: boolean
        }
        Returns: Json
      }
      suspend_rider: {
        Args: { _rider_id: string; _suspend: boolean }
        Returns: boolean
      }
      verify_delivery_otp: {
        Args: { _order_id?: string; _otp: string; _rider_request_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "rider" | "customer" | "business"
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
      app_role: ["admin", "moderator", "rider", "customer", "business"],
    },
  },
} as const
