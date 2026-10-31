import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'

// Both values are public by design (the publishable key only works within the database's row rules),
// so they fall back to the real project when the host's build doesn't pass .env through.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://pkjjaoochkfjdcttgagw.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4Cz9zyYC8VFQvDVbOpG06Q_i9K-XO-N',
)

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
