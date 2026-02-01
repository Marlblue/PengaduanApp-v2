import { Session } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "masyarakat" | "petugas" | "admin";
export type UserStatus = "active" | "pending" | "rejected" | "deleted";
export type PengaduanStatus =
  | "pending"
  | "verified"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          status: UserStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
        };
      };
      kategori_pengaduan: {
        Row: {
          id: number;
          nama: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          nama: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          nama?: string;
          created_at?: string;
        };
      };
      pengaduan: {
        Row: {
          id: string;
          user_id: string;
          judul: string;
          deskripsi: string;
          kategori_id: number | null;
          foto_url: string | null;
          latitude: number | null;
          longitude: number | null;
          alamat: string | null;
          petugas_id: string | null;
          status: PengaduanStatus;
          tanggapan: string | null;
          foto_penanganan_url: string | null;
          catatan_petugas: string | null;
          rating: number | null;
          ulasan: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          judul: string;
          deskripsi: string;
          kategori_id?: number | null;
          foto_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          alamat?: string | null;
          petugas_id?: string | null;
          status?: PengaduanStatus;
          tanggapan?: string | null;
          foto_penanganan_url?: string | null;
          catatan_petugas?: string | null;
          rating?: number | null;
          ulasan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          judul?: string;
          deskripsi?: string;
          kategori_id?: number | null;
          foto_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          alamat?: string | null;
          petugas_id?: string | null;
          status?: PengaduanStatus;
          tanggapan?: string | null;
          foto_penanganan_url?: string | null;
          catatan_petugas?: string | null;
          rating?: number | null;
          ulasan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      aspirasi: {
        Row: {
          id: string;
          user_id: string;
          judul: string;
          deskripsi: string;
          kategori_id: number | null;
          status: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          judul: string;
          deskripsi: string;
          kategori_id?: number | null;
          status?: string;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          judul?: string;
          deskripsi?: string;
          kategori_id?: number | null;
          status?: string;
          likes_count?: number;
          created_at?: string;
        };
      };
      komentar: {
        Row: {
          id: string;
          pengaduan_id: string;
          user_id: string;
          isi: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pengaduan_id: string;
          user_id: string;
          isi: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pengaduan_id?: string;
          user_id?: string;
          isi?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Helper Types for Frontend
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type KategoriPengaduan =
  Database["public"]["Tables"]["kategori_pengaduan"]["Row"];
export type Pengaduan = Database["public"]["Tables"]["pengaduan"]["Row"];
export type Aspirasi = Database["public"]["Tables"]["aspirasi"]["Row"];

export type LocationData = {
  latitude: number;
  longitude: number;
  address?: string | null;
};

export type AuthState = {
  user: Profile | null;
  session: Session | null;
  loading: boolean;
};
