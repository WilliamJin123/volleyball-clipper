export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          credits: number
          default_clip_padding: number
          default_min_confidence: number
          output_resolution: string
          auto_retry: boolean
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          credits?: number
          default_clip_padding?: number
          default_min_confidence?: number
          output_resolution?: string
          auto_retry?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          credits?: number
          default_clip_padding?: number
          default_min_confidence?: number
          output_resolution?: string
          auto_retry?: boolean
          created_at?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          user_id: string
          r2_path: string
          filename: string
          status: VideoStatus
          twelvelabs_index_id: string | null
          twelvelabs_video_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          r2_path: string
          filename: string
          status?: VideoStatus
          twelvelabs_index_id?: string | null
          twelvelabs_video_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          r2_path?: string
          filename?: string
          status?: VideoStatus
          twelvelabs_index_id?: string | null
          twelvelabs_video_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          video_id: string
          query: string
          padding: number
          status: JobStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          query: string
          padding?: number
          status?: JobStatus
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          query?: string
          padding?: number
          status?: JobStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          }
        ]
      }
      clips: {
        Row: {
          id: string
          job_id: string
          r2_path: string
          public_url: string
          start_time: number
          end_time: number
          thumbnail_r2_path: string | null
          thumbnail_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          r2_path: string
          public_url: string
          start_time: number
          end_time: number
          thumbnail_r2_path?: string | null
          thumbnail_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          r2_path?: string
          public_url?: string
          start_time?: number
          end_time?: number
          thumbnail_r2_path?: string | null
          thumbnail_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clips_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      video_status: VideoStatus
      job_status: JobStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type Clip = Database['public']['Tables']['clips']['Row']

// Insert types
export type VideoInsert = Database['public']['Tables']['videos']['Insert']
export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type ClipInsert = Database['public']['Tables']['clips']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type VideoUpdate = Database['public']['Tables']['videos']['Update']
export type JobUpdate = Database['public']['Tables']['jobs']['Update']

// Extended types with relations
export type JobWithVideo = Job & {
  videos: Video
}

export type JobWithClips = Job & {
  clips: Clip[]
}

export type JobWithVideoAndClips = Job & {
  videos: Video
  clips: Clip[]
}
