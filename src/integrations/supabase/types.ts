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
      activityspots: {
        Row: {
          accessibility_stroller: boolean | null
          accessibility_wheelchair: boolean | null
          activity_type: string[]
          age_buckets: string[]
          created_at: string
          description: string
          duration_minutes: number | null
          event_endtime: string | null
          event_starttime: string | null
          facilities_changingtable: boolean | null
          facilities_restrooms: boolean | null
          foodvenue_kidamenities: boolean | null
          foodvenue_kidcorner: boolean | null
          foodvenue_kidmenu: boolean | null
          id: string
          imageurlthumb: string | null
          json: Json
          location_address: string | null
          location_environment: string | null
          location_lat: number | null
          location_lon: number | null
          max_price: number | null
          min_price: number | null
          name: string
          schedule_openinghours: Json | null
          schema_version: string | null
          source: string | null
          trail_durationminutes: number | null
          trail_lengthkm: number | null
          trail_routetype: string | null
          updated_at: string
          urlmoreinfo: string | null
        }
        Insert: {
          accessibility_stroller?: boolean | null
          accessibility_wheelchair?: boolean | null
          activity_type?: string[]
          age_buckets?: string[]
          created_at?: string
          description: string
          duration_minutes?: number | null
          event_endtime?: string | null
          event_starttime?: string | null
          facilities_changingtable?: boolean | null
          facilities_restrooms?: boolean | null
          foodvenue_kidamenities?: boolean | null
          foodvenue_kidcorner?: boolean | null
          foodvenue_kidmenu?: boolean | null
          id: string
          imageurlthumb?: string | null
          json: Json
          location_address?: string | null
          location_environment?: string | null
          location_lat?: number | null
          location_lon?: number | null
          max_price?: number | null
          min_price?: number | null
          name: string
          schedule_openinghours?: Json | null
          schema_version?: string | null
          source?: string | null
          trail_durationminutes?: number | null
          trail_lengthkm?: number | null
          trail_routetype?: string | null
          updated_at?: string
          urlmoreinfo?: string | null
        }
        Update: {
          accessibility_stroller?: boolean | null
          accessibility_wheelchair?: boolean | null
          activity_type?: string[]
          age_buckets?: string[]
          created_at?: string
          description?: string
          duration_minutes?: number | null
          event_endtime?: string | null
          event_starttime?: string | null
          facilities_changingtable?: boolean | null
          facilities_restrooms?: boolean | null
          foodvenue_kidamenities?: boolean | null
          foodvenue_kidcorner?: boolean | null
          foodvenue_kidmenu?: boolean | null
          id?: string
          imageurlthumb?: string | null
          json?: Json
          location_address?: string | null
          location_environment?: string | null
          location_lat?: number | null
          location_lon?: number | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          schedule_openinghours?: Json | null
          schema_version?: string | null
          source?: string | null
          trail_durationminutes?: number | null
          trail_lengthkm?: number | null
          trail_routetype?: string | null
          updated_at?: string
          urlmoreinfo?: string | null
        }
        Relationships: []
      }
      activityspots_genai: {
        Row: {
          activity_type: string[]
          age_buckets: string[]
          created_at: string
          description: string
          id: string
          imageurlthumb: string | null
          json: Json
          location_address: string | null
          location_environment: string | null
          location_lat: number | null
          location_lon: number | null
          max_price: number | null
          min_price: number | null
          name: string
          source: string | null
          updated_at: string
          urlmoreinfo: string | null
        }
        Insert: {
          activity_type?: string[]
          age_buckets?: string[]
          created_at?: string
          description?: string
          id: string
          imageurlthumb?: string | null
          json: Json
          location_address?: string | null
          location_environment?: string | null
          location_lat?: number | null
          location_lon?: number | null
          max_price?: number | null
          min_price?: number | null
          name: string
          source?: string | null
          updated_at?: string
          urlmoreinfo?: string | null
        }
        Update: {
          activity_type?: string[]
          age_buckets?: string[]
          created_at?: string
          description?: string
          id?: string
          imageurlthumb?: string | null
          json?: Json
          location_address?: string | null
          location_environment?: string | null
          location_lat?: number | null
          location_lon?: number | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          source?: string | null
          updated_at?: string
          urlmoreinfo?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          children_ages: string | null
          city: string | null
          created_at: string
          discoverable: boolean | null
          family_size: number | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          children_ages?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean | null
          family_size?: number | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          children_ages?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean | null
          family_size?: number | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_trips: {
        Row: {
          created_at: string
          events: Json
          id: string
          name: string
          recipients: string[] | null
          share_token: string | null
          total_cost: number | null
          total_events: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: Json
          id?: string
          name: string
          recipients?: string[] | null
          share_token?: string | null
          total_cost?: number | null
          total_events?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: Json
          id?: string
          name?: string
          recipients?: string[] | null
          share_token?: string | null
          total_cost?: number | null
          total_events?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_confirmations: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          id: string
          recipient_email: string
          trip_id: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          recipient_email: string
          trip_id: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          recipient_email?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_confirmations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "saved_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_confirmations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "shared_trips_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      shared_trips_view: {
        Row: {
          created_at: string | null
          events: Json | null
          id: string | null
          name: string | null
          share_token: string | null
          total_cost: number | null
          total_events: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          events?: Json | null
          id?: string | null
          name?: string | null
          share_token?: string | null
          total_cost?: number | null
          total_events?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          events?: Json | null
          id?: string | null
          name?: string | null
          share_token?: string | null
          total_cost?: number | null
          total_events?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
