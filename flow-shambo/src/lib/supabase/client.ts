
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tgwwzppwoyfqidkgwrwa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnd3d6cHB3b3lmcWlka2d3cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTMzNzMsImV4cCI6MjA4NDM4OTM3M30.Vda8Qgf2HrdVGGCMlK4xqKJhMapcJsuXgCO1j28AhFs';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Missing Supabase env vars. Using fallbacks. Please restart server if you added .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
