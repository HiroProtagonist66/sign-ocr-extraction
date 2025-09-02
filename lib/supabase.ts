import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if properly configured
const isConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

// Only show warning in development
if (!isConfigured && process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ Supabase environment variables not configured.',
    '\n📝 To connect to Supabase:',
    '\n   1. Install Vercel CLI: npm i -g vercel',
    '\n   2. Link project: vercel link',
    '\n   3. Pull env vars: vercel env pull .env.local',
    '\n\n💡 The app will work with demo data in development mode.'
  );
}

// Create mock client for development without credentials
const mockSupabase = {
  from: (table: string) => ({
    select: (query?: string) => ({
      eq: (column: string, value: any) => ({
        order: (column: string) => Promise.resolve({ 
          data: null, 
          error: new Error('Supabase not configured - using demo mode') 
        })
      }),
      order: (column: string) => Promise.resolve({ 
        data: null, 
        error: new Error('Supabase not configured - using demo mode') 
      }),
      not: (column: string, operator: string, value: any) => Promise.resolve({ 
        data: null, 
        error: new Error('Supabase not configured - using demo mode') 
      })
    }),
    upsert: (data: any, options?: any) => Promise.resolve({ 
      data: null, 
      error: new Error('Supabase not configured - using demo mode') 
    }),
    insert: (data: any) => Promise.resolve({ 
      data: null, 
      error: new Error('Supabase not configured - using demo mode') 
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ 
        data: null, 
        error: new Error('Supabase not configured - using demo mode') 
      })
    }),
    delete: () => Promise.resolve({ 
      data: null, 
      error: new Error('Supabase not configured - using demo mode') 
    })
  }),
  rpc: (name: string, params?: any) => Promise.resolve({ 
    data: null, 
    error: new Error('Supabase not configured - using demo mode') 
  }),
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: any, options?: any) => Promise.resolve({ 
        data: null, 
        error: new Error('Supabase not configured - using demo mode') 
      }),
      getPublicUrl: (path: string) => ({ 
        data: { publicUrl: '' } 
      })
    })
  }
} as any;

// Export client or mock based on configuration
export const supabase = isConfigured && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => isConfigured;

// Type definitions for our database
export interface SignDescription {
  id: string;
  sign_type_code: string;
  description: string;
}

export interface ProjectSignCatalog {
  id: string;
  site_id: string;
  sign_number: string;
  sign_description_id: string | null;
  side_a_message: string | null;
  side_b_message: string | null;
  sign_descriptions?: SignDescription;
}

export interface Hotspot {
  id: string;
  slp_page_id: string;
  sign_number: string;
  sign_description_id: string | null;
  x_percentage: number;
  y_percentage: number;
}