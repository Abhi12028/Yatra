<template>
  <div v-if="car" class="page car-page" :style="{ '--c': car.color }">
    <header class="chead">
      <button class="back" aria-label="Back" @click="$router.back()"><q-icon name="arrow_back" size="22px" /></button>
      <div class="txt">
        <div class="eyebrow light">{{ people.length }} {{ people.length === 1 ? 'yatri' : 'yatris' }}{{ car.id === me.car.id ? ' · your car' : '' }}</div>
        <h1 class="name">{{ car.name }}</h1>
      </div>
      <div class="road" />
      <CarArt class="art" :kind="car.kind" :color="car.color" />
    </header>

    <div class="cstats">
      <div><b>{{ s?.live && s.moving ? Math.round(s.kmh) : 0 }}</b><span>km/h</span></div>
      <div><b>{{ s?.live ? Math.round(s.km) : '–' }}</b><span>km done</span></div>
      <div><b>{{ s?.live ? (s.next?.name ?? '🛕') : '–' }}</b><span>{{ s?.live ? (s.next ? 'next stop' : 'arrived') : 'no signal' }}</span></div>
    </div>

    <section class="hc">
      <div class="hc-head">
        <svg class="ring" viewBox="0 0 58 58" aria-hidden="true">
          <circle class="bg" cx="29" cy="29" r="24" />
          <circle class="fg" cx="29" cy="29" r="24" stroke-dasharray="150.8" :stroke-dashoffset="150.8 * (1 - inCount / Math.max(people.length, 1))" />
          <text x="29" y="30">{{ inCount }}/{{ people.length }}</text>
        </svg>
        <div>
          <h3>Headcount</h3>
          <p v-if="!people.length" class="muted">Nobody has joined this car yet.</p>
          <p v-else-if="inCount === people.length" class="all">All aboard! Ready to go 🙏</p>
          <p v-else class="muted">Waiting for {{ missing.join(', ') }}</p>
        </div>
      </div>

      <div v-if="people.length" class="topcar">
        <div v-for="(row, r) in rows" :key="r" class="srow">
          <button v-for="p in row" :key="p.id" class="seat" :class="{ in: !outOfCar[p.id] }" :aria-pressed="!outOfCar[p.id]" @click="toggle(p)">
            <span class="face">{{ p.name[0] }}</span>
            <small>{{ p.id === me.id ? 'You' : p.name }}</small>
          </button>
        </div>
      </div>
      <p class="hint muted">Tap a person when they get back in. Everyone in the trip sees this live.</p>
      <div class="hc-acts">
        <button :disabled="busy || !people.length" @click="all(false)">Everyone out (stop)</button>
        <button class="main" :disabled="busy || !people.length" @click="all(true)">Mark all in</button>
      </div>
    </section>

    <section class="sharing">
      <h3>Location sharing</h3>
      <div v-for="p in people" :key="p.id" class="sh-row">
        <span class="avatar sm" :style="{ background: car.color }">{{ p.name[0] }}</span>
        <span class="sh-name">{{ p.id === me.id ? 'You' : p.name }}</span>
        <span class="muted sh-when">{{ locs[p.id] ? (isLive(locs[p.id]) ? 'live' : ago(locs[p.id].updated_at)) : 'never shared' }}</span>
      </div>
    </section>
  </div>
  <div v-else class="page"><p class="muted">Loading car…</p></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Notify } from 'quasar'
import { me } from '../supabase'
import { cars, crew, carStats, outOfCar, locs, isLive, setInCar, startTrip } from '../trip'
import { ago } from '../format'
import CarArt from '../components/CarArt.vue'

const route = useRoute()
const busy = ref(false)
const car = computed(() => cars.value.find((c) => c.id === route.params.id))
const s = computed(() => carStats.value[route.params.id])
const people = computed(() => (car.value ? crew(car.value.id) : []))
const inCount = computed(() => people.value.filter((p) => !outOfCar.value[p.id]).length)
const missing = computed(() => people.value.filter((p) => outOfCar.value[p.id]).map((p) => p.name))
// ponytail: seats are just front 2 then rows of 3; real seating isn't stored
const rows = computed(() => {
  const p = people.value, out = [p.slice(0, 2)]
  for (let i = 2; i < p.length; i += 3) out.push(p.slice(i, i + 3))
  return out
})

async function save(ids, inCar) {
  const wasAll = inCount.value === people.value.length
  const error = await setInCar(ids, inCar)
  if (error) return Notify.create({ type: 'negative', message: 'Could not update the headcount. Check your internet.', position: 'top' })
  if (!wasAll && inCount.value === people.value.length && people.value.length) {
    Notify.create({ color: 'positive', message: `${car.value.name}: all aboard!`, position: 'top', timeout: 1500 })
  }
}
const toggle = (p) => save([p.id], !!outOfCar.value[p.id])
async function all(inCar) {
  busy.value = true
  await save(people.value.map((p) => p.id), inCar)
  busy.value = false
}

onMounted(startTrip)
</script>

<style scoped>
.car-page { padding-top: 0; }
.chead {
  position: relative; margin: 0 -18px; height: 250px; overflow: hidden; color: #fff;
  background: var(--jaali), linear-gradient(160deg, var(--c), color-mix(in srgb, var(--c) 35%, var(--kumkum)));
}
.chead::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 14px; background: var(--scallop); transform: scaleY(-1); }
.back { position: absolute; left: 14px; top: max(16px, env(safe-area-inset-top)); z-index: 2; width: 42px; height: 42px; border: 0; border-radius: 14px; background: rgba(255, 255, 255, .18); color: #fff; display: grid; place-items: center; cursor: pointer; }
.txt { position: absolute; left: 18px; top: calc(max(16px, env(safe-area-inset-top)) + 54px); z-index: 1; }
.eyebrow.light { color: rgba(255, 255, 255, .8); }
.name { font-size: 48px; margin-top: 4px; text-shadow: 0 2px 12px rgba(0, 0, 0, .25); }
.road { position: absolute; left: 0; right: 0; bottom: 14px; height: 24px; background: rgba(0, 0, 0, .18); }
.art { position: absolute; right: -6px; bottom: 26px; width: 250px; }

.cstats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 6px; }
.cstats div { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 10px 12px; min-width: 0; }
.cstats b { display: block; font-family: 'Rozha One', serif; font-weight: 400; font-size: 22px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cstats span { font-size: 11px; color: var(--ink-2); font-weight: 600; }

.hc, .sharing { margin-top: 14px; padding: 16px; border-radius: 24px; background: var(--card); border: 1px solid var(--line); }
.hc-head { display: flex; align-items: center; gap: 12px; }
.hc-head h3, .sharing h3 { font-size: 22px; }
.hc-head p { margin: 2px 0 0; font-size: 13px; }
.all { color: var(--ok); font-weight: 700; }
.ring { width: 58px; height: 58px; flex: none; }
.ring circle { fill: none; stroke-width: 6; }
.ring .bg { stroke: var(--sandal); }
.ring .fg { stroke: var(--c); stroke-linecap: round; transition: stroke-dashoffset .35s; transform: rotate(-90deg); transform-origin: 50% 50%; }
.ring text { font-family: 'Rozha One', serif; font-size: 16px; fill: var(--ink); text-anchor: middle; dominant-baseline: central; }

/* Top-down car with seats */
.topcar {
  position: relative; margin: 18px auto 6px; width: 220px; max-width: 100%; box-sizing: border-box; padding: 56px 14px 40px;
  border-radius: 90px 90px 46px 46px / 120px 120px 40px 40px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 85%, black), var(--c) 20% 80%, color-mix(in srgb, var(--c) 85%, black));
  box-shadow: inset 0 0 0 4px rgba(255, 255, 255, .25), 0 18px 30px -18px rgba(0, 0, 0, .5);
}
.topcar::before { content: ""; position: absolute; left: 30px; right: 30px; top: 18px; height: 26px; border-radius: 40px 40px 8px 8px; background: linear-gradient(#2A2230, #4A3F52); opacity: .85; }
.topcar::after { content: ""; position: absolute; left: 34px; right: 34px; bottom: 12px; height: 16px; border-radius: 6px 6px 20px 20px; background: linear-gradient(#4A3F52, #2A2230); opacity: .8; }
.srow { display: flex; justify-content: center; gap: 8px; margin-bottom: 26px; }
.seat { position: relative; width: 52px; height: 56px; border: 0; border-radius: 14px 14px 10px 10px; background: rgba(255, 255, 255, .22); display: grid; place-items: center; padding: 0; cursor: pointer; }
.face { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-family: 'Rozha One', serif; font-size: 17px; background: var(--card); color: var(--ink); opacity: .45; filter: grayscale(1); transition: all .2s; }
.seat.in .face { opacity: 1; filter: none; box-shadow: 0 0 0 3px var(--gold); }
.seat.in::after { content: "✓"; position: absolute; right: -4px; top: -4px; width: 18px; height: 18px; border-radius: 50%; background: var(--ok); color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; }
.seat small { position: absolute; bottom: -17px; left: 50%; transform: translateX(-50%); max-width: 62px; overflow: hidden; text-overflow: ellipsis; font-size: 10px; font-weight: 700; color: #fff; white-space: nowrap; text-shadow: 0 1px 2px rgba(0, 0, 0, .4); }
.hint { font-size: 12px; text-align: center; margin: 8px 0 0; }
.hc-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
.hc-acts button { border: 0; border-radius: 14px; padding: 12px; font: inherit; font-weight: 700; font-size: 14px; background: var(--bg); color: var(--ink); cursor: pointer; }
.hc-acts button.main { background: var(--kumkum); color: #FFE7B0; }
.hc-acts button:disabled { opacity: .5; cursor: default; }

.sh-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px dashed var(--line); }
.sh-row:first-of-type { border-top: 0; margin-top: 6px; }
.avatar.sm { width: 30px; height: 30px; font-size: 13px; font-family: 'Rozha One', serif; font-weight: 400; }
.sh-name { flex: 1; font-weight: 600; }
.sh-when { font-size: 12px; }
</style>
