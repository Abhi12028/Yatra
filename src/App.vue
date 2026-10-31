<template>
  <router-view />
  <nav v-if="me" class="tabbar">
    <button v-for="t in tabs" :key="t.label" :class="{ on: t.path === $route.path || (t.path === '/' && $route.path.startsWith('/car/')) }" @click="go(t)">
      <q-icon :name="t.icon" size="24px" />
      <span>{{ t.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { me, supabase } from './supabase'
import { startTracking } from './tracker'
import { startTrip, pings, cars } from './trip'

watch(me, (m) => m && (startTracking(), startTrip()), { immediate: true })

const router = useRouter()
const tabs = [
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Live map', icon: 'map', path: '/map' },
  { label: 'Expenses', icon: 'currency_rupee', path: '/money' },
  { label: 'Games', icon: 'emoji_events', path: '/games' },
  { label: 'Docs', icon: 'confirmation_number', path: '/docs' },
]
const go = (t) => router.push(t.path)

// A ping from the other car pops up on every phone in this car, with an OK that the sender sees.
const seen = new Set()
watch(pings, (list) => {
  for (const p of list) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    const fresh = Date.now() - new Date(p.created_at) < 2 * 60 * 1000
    if (!fresh || p.from_car === me.value?.car.id || p.ack_by) continue
    const from = cars.value.find((c) => c.id === p.from_car)?.name ?? 'Other car'
    if (navigator.vibrate) navigator.vibrate(p.msg.startsWith('SOS') ? [400, 200, 400, 200, 400] : 200)
    Notify.create({
      message: `${p.emoji} ${from}: ${p.msg}`, color: p.msg.startsWith('SOS') ? 'negative' : 'primary', position: 'top', timeout: 8000,
      actions: [{ label: '👍 OK', color: 'amber', handler: () => supabase.from('pings').update({ ack_by: me.value.name }).eq('id', p.id).then() }],
    })
  }
}, { immediate: true })
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(12px + env(safe-area-inset-bottom));
  width: min(calc(100% - 24px), 456px);
  display: flex;
  justify-content: space-around;
  padding: 8px;
  border-radius: 24px;
  background: rgba(90, 11, 22, .94);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px -12px rgba(90, 11, 22, .45);
  z-index: 10;
}
.tabbar button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  border: 0;
  border-radius: 16px;
  background: none;
  color: rgba(255, 255, 255, .45);
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}
.tabbar button.on { color: white; background: rgba(255, 255, 255, .1); }
.tabbar button.on .q-icon { color: var(--marigold); }
</style>
