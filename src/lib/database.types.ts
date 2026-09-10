// Placeholder until `npm run db:types` regenerates this from the local database.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RoleT = "applicant" | "organizer";
type TrackT = "hacker" | "judge" | "mentor" | "volunteer";
type StatusT = "draft" | "submitted" | "under_review" | "accepted" | "waitlisted" | "rejected";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string; role: RoleT; created_at: string };
        Insert: { id: string; email: string; full_name?: string; role?: RoleT; created_at?: string };
        Update: { id?: string; email?: string; full_name?: string; role?: RoleT; created_at?: string };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          track: TrackT;
          status: StatusT;
          answers: Json;
          submitted_at: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track: TrackT;
          status?: StatusT;
          answers?: Json;
          submitted_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track?: TrackT;
          status?: StatusT;
          answers?: Json;
          submitted_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          application_id: string;
          reviewer_id: string;
          scores: Json;
          overall: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          reviewer_id: string;
          scores?: Json;
          overall: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          reviewer_id?: string;
          scores?: Json;
          overall?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          species: string;
          palette: Json;
          traits: Json;
          music: Json;
          xp: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          species: string;
          palette: Json;
          traits?: Json;
          music: Json;
          xp?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          species?: string;
          palette?: Json;
          traits?: Json;
          music?: Json;
          xp?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      application_review_summary: {
        Row: { application_id: string; review_count: number; avg_overall: number | null };
        Relationships: [];
      };
    };
    Functions: {
      is_organizer: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { role_t: RoleT; track_t: TrackT; status_t: StatusT };
    CompositeTypes: Record<string, never>;
  };
};
