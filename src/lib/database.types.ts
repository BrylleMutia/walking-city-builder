// Generated from the Supabase schema (project walking-pack-city-builder).
// Regenerate after changing the database; don't edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      card_sets: {
        Row: { id: string; is_active: boolean; name: string; price: number; sort_order: number; tagline: string }
        Insert: { id: string; is_active?: boolean; name: string; price: number; sort_order?: number; tagline?: string }
        Update: { id?: string; is_active?: boolean; name?: string; price?: number; sort_order?: number; tagline?: string }
        Relationships: []
      }
      city_tiles: {
        Row: { item_id: string; placed_at: string; user_id: string; x: number; y: number }
        Insert: { item_id: string; placed_at?: string; user_id: string; x: number; y: number }
        Update: { item_id?: string; placed_at?: string; user_id?: string; x?: number; y?: number }
        Relationships: [
          { foreignKeyName: "city_tiles_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["id"] },
          { foreignKeyName: "city_tiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      daily_steps: {
        Row: { day: string; steps: number; updated_at: string; user_id: string }
        Insert: { day: string; steps?: number; updated_at?: string; user_id: string }
        Update: { day?: string; steps?: number; updated_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "daily_steps_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      game_config: {
        Row: { cards_per_pack: number; foil_chance: number; grid_size: number; id: boolean; max_daily_steps: number; starting_balance: number }
        Insert: { cards_per_pack?: number; foil_chance?: number; grid_size?: number; id?: boolean; max_daily_steps?: number; starting_balance?: number }
        Update: { cards_per_pack?: number; foil_chance?: number; grid_size?: number; id?: boolean; max_daily_steps?: number; starting_balance?: number }
        Relationships: []
      }
      inventory: {
        Row: { foil_cards: number; item_id: string; quantity: number; user_id: string }
        Insert: { foil_cards?: number; item_id: string; quantity?: number; user_id: string }
        Update: { foil_cards?: number; item_id?: string; quantity?: number; user_id?: string }
        Relationships: [
          { foreignKeyName: "inventory_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["id"] },
          { foreignKeyName: "inventory_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      items: {
        Row: { id: string; kind: string; name: string; rarity: string; set_id: string; tiles_per_card: number; walkable: boolean }
        Insert: { id: string; kind: string; name: string; rarity: string; set_id: string; tiles_per_card?: number; walkable?: boolean }
        Update: { id?: string; kind?: string; name?: string; rarity?: string; set_id?: string; tiles_per_card?: number; walkable?: boolean }
        Relationships: [
          { foreignKeyName: "items_rarity_fkey"; columns: ["rarity"]; isOneToOne: false; referencedRelation: "rarities"; referencedColumns: ["id"] },
          { foreignKeyName: "items_set_id_fkey"; columns: ["set_id"]; isOneToOne: false; referencedRelation: "card_sets"; referencedColumns: ["id"] },
        ]
      }
      pack_cards: {
        Row: { foil: boolean; item_id: string; opening_id: string; position: number; rarity: string }
        Insert: { foil?: boolean; item_id: string; opening_id: string; position: number; rarity: string }
        Update: { foil?: boolean; item_id?: string; opening_id?: string; position?: number; rarity?: string }
        Relationships: [
          { foreignKeyName: "pack_cards_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["id"] },
          { foreignKeyName: "pack_cards_opening_id_fkey"; columns: ["opening_id"]; isOneToOne: false; referencedRelation: "pack_openings"; referencedColumns: ["id"] },
          { foreignKeyName: "pack_cards_rarity_fkey"; columns: ["rarity"]; isOneToOne: false; referencedRelation: "rarities"; referencedColumns: ["id"] },
        ]
      }
      pack_openings: {
        Row: { cost: number; created_at: string; id: string; set_id: string; user_id: string }
        Insert: { cost: number; created_at?: string; id?: string; set_id: string; user_id: string }
        Update: { cost?: number; created_at?: string; id?: string; set_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "pack_openings_set_id_fkey"; columns: ["set_id"]; isOneToOne: false; referencedRelation: "card_sets"; referencedColumns: ["id"] },
          { foreignKeyName: "pack_openings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { balance: number; created_at: string; display_name: string; id: string; is_tester: boolean; lifetime_steps: number; packs_opened: number; step_goal: number; updated_at: string }
        Insert: { balance?: number; created_at?: string; display_name?: string; id: string; is_tester?: boolean; lifetime_steps?: number; packs_opened?: number; step_goal?: number; updated_at?: string }
        Update: { balance?: number; created_at?: string; display_name?: string; id?: string; is_tester?: boolean; lifetime_steps?: number; packs_opened?: number; step_goal?: number; updated_at?: string }
        Relationships: []
      }
      rarities: {
        Row: { id: string; tier: number; weight: number }
        Insert: { id: string; tier: number; weight: number }
        Update: { id?: string; tier?: number; weight?: number }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      buy_pack: {
        Args: { p_force_foil?: boolean; p_force_legendary?: boolean; p_set_id: string }
        Returns: Json
      }
      get_my_state: { Args: { p_since?: string }; Returns: Json }
      place_item: { Args: { p_item_id: string; p_x: number; p_y: number }; Returns: Json }
      remove_item: { Args: { p_x: number; p_y: number }; Returns: Json }
      reset_progress: { Args: never; Returns: Json }
      sync_steps: { Args: { p_day: string; p_steps: number }; Returns: Json }
      update_profile: { Args: { p_display_name?: string; p_step_goal?: number }; Returns: Json }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
