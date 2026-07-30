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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_access_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          requester_email: string
          requester_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          requester_email: string
          requester_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          requester_email?: string
          requester_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      availability_slot_admin_meta: {
        Row: {
          created_at: string
          created_by: string | null
          internal_note: string | null
          slot_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          internal_note?: string | null
          slot_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          internal_note?: string | null
          slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slot_admin_meta_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          buffer_minutes: number
          created_at: string
          duo_partner: string | null
          ends_at: string
          id: string
          is_content_shoot: boolean
          is_duo: boolean
          is_hidden: boolean
          location: string
          starts_at: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          duo_partner?: string | null
          ends_at: string
          id?: string
          is_content_shoot?: boolean
          is_duo?: boolean
          is_hidden?: boolean
          location?: string
          starts_at: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          duo_partner?: string | null
          ends_at?: string
          id?: string
          is_content_shoot?: boolean
          is_duo?: boolean
          is_hidden?: boolean
          location?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_note: string | null
          anzahlung: number
          anzahlung_method: string | null
          anzahlung_paid: boolean
          bar: number
          confirmation_note: string | null
          created_at: string
          duration: string | null
          duration_minutes: number | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          message: string
          requested_start: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          anzahlung?: number
          anzahlung_method?: string | null
          anzahlung_paid?: boolean
          bar?: number
          confirmation_note?: string | null
          created_at?: string
          duration?: string | null
          duration_minutes?: number | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          message: string
          requested_start?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          anzahlung?: number
          anzahlung_method?: string | null
          anzahlung_paid?: boolean
          bar?: number
          confirmation_note?: string | null
          created_at?: string
          duration?: string | null
          duration_minutes?: number | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          message?: string
          requested_start?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_book_entries: {
        Row: {
          anzahlung: number
          anzahlung_method: string | null
          bar: number
          created_at: string
          created_by: string | null
          datum: string
          gesamt: number | null
          id: string
          kunde: string
          notiz: string | null
          studio: string
          updated_at: string
        }
        Insert: {
          anzahlung?: number
          anzahlung_method?: string | null
          bar?: number
          created_at?: string
          created_by?: string | null
          datum: string
          gesamt?: number | null
          id?: string
          kunde: string
          notiz?: string | null
          studio: string
          updated_at?: string
        }
        Update: {
          anzahlung?: number
          anzahlung_method?: string | null
          bar?: number
          created_at?: string
          created_by?: string | null
          datum?: string
          gesamt?: number | null
          id?: string
          kunde?: string
          notiz?: string | null
          studio?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          id: string
          phone: string | null
          pseudonym: string | null
          gesundheit: string | null
          safeword: string | null
          tabus: string | null
          updated_at: string
          vorlieben: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          pseudonym?: string | null
          gesundheit?: string | null
          safeword?: string | null
          tabus?: string | null
          updated_at?: string
          vorlieben?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          pseudonym?: string | null
          gesundheit?: string | null
          safeword?: string | null
          tabus?: string | null
          updated_at?: string
          vorlieben?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      photoshoot_requests: {
        Row: {
          budget_type: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          shoot_type: string
          social_media: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_type: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          shoot_type: string
          social_media?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_type?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          shoot_type?: string
          social_media?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          body: string
          slug: string
          updated_at: string
        }
        Insert: {
          body?: string
          slug: string
          updated_at?: string
        }
        Update: {
          body?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          admin_note: string | null
          content: string
          created_at: string
          id: string
          pseudonym: string
          rating: number | null
          status: Database["public"]["Enums"]["testimonial_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          content: string
          created_at?: string
          id?: string
          pseudonym: string
          rating?: number | null
          status?: Database["public"]["Enums"]["testimonial_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          content?: string
          created_at?: string
          id?: string
          pseudonym?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["testimonial_status"]
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      list_slot_busy_ranges: {
        Args: { _slot_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "declined"
        | "rescheduling"
        | "waiting_deposit"
        | "open"
      slot_status: "open" | "held" | "booked"
      testimonial_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "declined",
        "rescheduling",
        "waiting_deposit",
        "open",
      ],
      slot_status: ["open", "held", "booked"],
      testimonial_status: ["pending", "approved", "rejected"],
    },
  },
} as const
