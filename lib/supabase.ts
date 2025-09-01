import { createClient } from '@supabase/supabase-js';

// These should be in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

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