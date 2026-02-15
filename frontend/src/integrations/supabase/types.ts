export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
          user_id: string | null
          phone: string | null
          is_super: boolean | null
          created_at: string | null
          name: string | null
          is_active: boolean | null
          email: string | null
          updated_at: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      businesses: {
        Row: {
          id: string
          name: string
          type: string
          image: string | null
          rating: number | null
          featured: boolean | null
          is_active: boolean | null
          is_approved: boolean | null
          owner_phone: string | null
          owner_user_id: string | null
          address: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
          owner_name: string | null
          city: string | null
          phone: string | null
          description: string | null
          category: string | null
          eta: string | null
          distance: string | null
          commission_rate: number | null
          claimed: boolean | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          owner_email: string | null
          is_busy: boolean | null
          update_at: string | null
          deleted_at: string | null
          total_ratings: number | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          rider_id: string | null
          status: string | null
          total_amount: number | null
          created_at: string | null
          delivery_otp: string | null
          otp_verified: boolean | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          distance_km: number | null
          estimated_fare: number | null
          actual_fare: number | null
          rider_earning: number | null
          commission: number | null
          surge_multiplier: number | null
          fare_quote_id: string | null
          fare_locked_at: string | null
          assigned_at: string | null
          completed_at: string | null
          zone: string | null
          service_type: string | null
          is_rated: boolean | null
          rated_at: string | null
          business_id: string | null
          items: Json | null
          subtotal: number | null
          delivery_fee: number | null
          total: number | null
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          eta: string | null
          updated_at: string | null
          payment_status: string | null
          rejection_reason: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      rider_requests: {
        Row: {
          id: string
          order_id: string | null
          rider_id: string | null
          customer_id: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          customer_phone: string | null
          pickup_address: string | null
          dropoff_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          total: number | null
          rider_earning: number | null
          commission: number | null
          distance_km: number | null
          item_description: string | null
          delivery_otp: string | null
          otp_verified: boolean | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      riders: {
        Row: {
          id: string
          user_id: string | null
          name: string | null
          phone: string | null
          vehicle_type: string | null
          is_online: boolean | null
          created_at: string | null
          verification_status: string | null
          is_active: boolean | null
          image: string | null
          cnic_front: string | null
          cnic_back: string | null
          license_image: string | null
          last_online_at: string | null
          current_location_lat: number | null
          current_location_lng: number | null
          rating: number | null
          total_trips: number | null
          commission_rate: number | null
          cnic: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      rider_payments: {
        Row: {
          id: string
          rider_id: string | null
          order_id: string | null
          rider_request_id: string | null
          amount: number | null
          final_amount: number | null
          status: string | null
          created_at: string | null
          distance_km: number | null
          base_fee: number | null
          per_km_rate: number | null
          calculated_amount: number | null
          rider_lat: number | null
          rider_lng: number | null
          customer_lat: number | null
          customer_lng: number | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      payments: {
        Row: {
          id: string
          order_id: string | null
          rider_request_id: string | null
          user_id: string | null
          transaction_id: string | null
          amount: number | null
          payment_method: string | null
          payment_status: string | null
          qr_url: string | null
          payment_url: string | null
          expires_at: string | null
          created_at: string | null
          updated_at: string | null
          approved_by_name: string | null
          admin_notes: string | null
          payup_transaction_id: string | null
          claim_requested_at: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      withdrawal_requests: {
        Row: {
          id: string
          rider_id: string
          amount: number
          status: string
          admin_notes: string | null
          processed_by: string | null
          payment_method: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      rider_wallet_adjustments: {
        Row: {
          id: string
          rider_id: string
          amount: number
          adjustment_type: string
          reason: string | null
          status: string
          created_at: string
          processed_by: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
          order_id: string | null
          rider_request_id: string | null
        }
        Insert: { [key: string]: any }
        Update: { [key: string]: any }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
      create_rider_payment: {
        Args: {
          _order_id?: string
          _rider_request_id?: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          _user_id: string
          _title: string
          _message: string
          _type?: string
          _order_id?: string
          _rider_request_id?: string
        }
        Returns: string
      }
      send_system_notification: {
        Args: {
          _title: string
          _message: string
          _user_ids?: string[]
        }
        Returns: void
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "customer" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
