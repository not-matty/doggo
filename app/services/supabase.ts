// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dukosgsehpdjuwvdejzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a29zZ3NlaHBkanV3dmRlanpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEzOTI4NDIsImV4cCI6MjA0Njk2ODg0Mn0.0lozUqBjyrckDZbl7eGaK_eWOcsdDgk8fh0F1YpDSxo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
