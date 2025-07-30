import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For server-side operations
export const supabase = createClient(supabaseUrl, supabaseKey)

// For client-side operations (React components)
export const createSupabaseClient = () => createClientComponentClient()

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          subscription_status: 'free' | 'premium' | 'canceled'
          message_count: number
          max_messages: number
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          subscription_status?: 'free' | 'premium' | 'canceled'
          message_count?: number
          max_messages?: number
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          subscription_status?: 'free' | 'premium' | 'canceled'
          message_count?: number
          max_messages?: number
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_session_id: string
          user_id: string
          content: string
          role: 'user' | 'assistant'
          ai_provider: 'openai' | 'anthropic' | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_session_id: string
          user_id: string
          content: string
          role: 'user' | 'assistant'
          ai_provider?: 'openai' | 'anthropic' | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_session_id?: string
          user_id?: string
          content?: string
          role?: 'user' | 'assistant'
          ai_provider?: 'openai' | 'anthropic' | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: 'active' | 'canceled' | 'past_due' | 'unpaid'
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: 'active' | 'canceled' | 'past_due' | 'unpaid'
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_customer_id?: string
          status?: 'active' | 'canceled' | 'past_due' | 'unpaid'
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      uploaded_files: {
        Row: {
          id: string
          user_id: string
          chat_session_id: string | null
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          analysis_result: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_session_id?: string | null
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          analysis_result?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_session_id?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          analysis_result?: Record<string, unknown> | null
          created_at?: string
        }
      }
    }
  }
}