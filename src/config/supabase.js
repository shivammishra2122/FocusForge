import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iillyubfkshzokaejywx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGx5dWJma3Noem9rYWVqeXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODg5MDgsImV4cCI6MjA4OTg2NDkwOH0.0SHp1t50KtonkjPfktAoNrqnnKRHOCdxYRBACPiU96U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
