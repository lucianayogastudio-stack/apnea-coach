import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auycuqwwpplrkyusqnmd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eWN1cXd3cHBscmt5dXNxbm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTIzMzYsImV4cCI6MjA5MjE2ODMzNn0.EeMVgmpqpoJZf75TfS723OZn6RH_ffbM-5OZUUqoErw'

export const supabase = createClient(supabaseUrl, supabaseKey)
