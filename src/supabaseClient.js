import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fmjvvrtzodsihmbzsacl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtanZ2cnR6b2RzaWhtYnpzYWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI4NTEsImV4cCI6MjA5NDIzODg1MX0.ZqN7W0V1wPX2hJbTbDZHL8eTijC3iHvQTWfKeL-rgAg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)