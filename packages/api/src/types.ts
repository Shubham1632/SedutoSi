export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string;
          id: string;
          screening_id: string;
          seats: string[];
          seats_count: number;
          status: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          total_price: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          screening_id: string;
          seats?: string[];
          seats_count?: number;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          total_price: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          screening_id?: string;
          seats?: string[];
          seats_count?: number;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          total_price?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_screening_id_fkey";
            columns: ["screening_id"];
            isOneToOne: false;
            referencedRelation: "screenings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cinemas: {
        Row: {
          address: string;
          created_at: string;
          id: string;
          name: string;
          neighborhood: string | null;
        };
        Insert: {
          address: string;
          created_at?: string;
          id?: string;
          name: string;
          neighborhood?: string | null;
        };
        Update: {
          address?: string;
          created_at?: string;
          id?: string;
          name?: string;
          neighborhood?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          location: string | null;
          price: number | null;
          starts_at: string;
          title: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          price?: number | null;
          starts_at: string;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          price?: number | null;
          starts_at?: string;
          title?: string;
        };
        Relationships: [];
      };
      movies: {
        Row: {
          created_at: string;
          description: string | null;
          duration_minutes: number;
          genre: string | null;
          id: string;
          language: string;
          poster_url: string | null;
          rating: string | null;
          release_date: string | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          genre?: string | null;
          id?: string;
          language?: string;
          poster_url?: string | null;
          rating?: string | null;
          release_date?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          genre?: string | null;
          id?: string;
          language?: string;
          poster_url?: string | null;
          rating?: string | null;
          release_date?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          brand: string;
          created_at: string;
          exp_month: number;
          exp_year: number;
          id: string;
          is_default: boolean;
          last4: string;
          user_id: string;
        };
        Insert: {
          brand: string;
          created_at?: string;
          exp_month: number;
          exp_year: number;
          id?: string;
          is_default?: boolean;
          last4: string;
          user_id: string;
        };
        Update: {
          brand?: string;
          created_at?: string;
          exp_month?: number;
          exp_year?: number;
          id?: string;
          is_default?: boolean;
          last4?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      screenings: {
        Row: {
          available_seats: number;
          created_at: string;
          ends_at: string;
          format: string | null;
          id: string;
          movie_id: string;
          price: number;
          screen_id: string;
          starts_at: string;
        };
        Insert: {
          available_seats: number;
          created_at?: string;
          ends_at: string;
          format?: string | null;
          id?: string;
          movie_id: string;
          price: number;
          screen_id: string;
          starts_at: string;
        };
        Update: {
          available_seats?: number;
          created_at?: string;
          ends_at?: string;
          format?: string | null;
          id?: string;
          movie_id?: string;
          price?: number;
          screen_id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "screenings_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "screenings_screen_id_fkey";
            columns: ["screen_id"];
            isOneToOne: false;
            referencedRelation: "screens";
            referencedColumns: ["id"];
          },
        ];
      };
      screens: {
        Row: {
          cinema_id: string;
          created_at: string;
          id: string;
          name: string;
          total_seats: number;
        };
        Insert: {
          cinema_id: string;
          created_at?: string;
          id?: string;
          name: string;
          total_seats?: number;
        };
        Update: {
          cinema_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          total_seats?: number;
        };
        Relationships: [
          {
            foreignKeyName: "screens_cinema_id_fkey";
            columns: ["cinema_id"];
            isOneToOne: false;
            referencedRelation: "cinemas";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlist: {
        Row: {
          created_at: string;
          id: string;
          movie_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          movie_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          movie_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_booked_seats: { Args: { p_screening_id: string }; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
