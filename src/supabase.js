import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

// The person using this phone: { id, name, family, car: { name, color }, trip: { name, starts_at } }, or null.
export const me = ref(null)

export async function loadMe() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return (me.value = null)
  const { data } = await supabase
    .from('members')
    .select('id, name, family, car:cars(id, name, color), trip:trips(id, name, starts_at)')
    .eq('user_id', session.user.id)
    .maybeSingle()
  return (me.value = data)
}
