<template>
  <div class="page">
    <header class="hello">
      <div class="who">
        <div class="muted hi">Namaste 🙏</div>
        <h2 class="me">{{ me.name }}</h2>
      </div>
      <button class="sos" aria-label="Emergency help" @click="sos = true">SOS</button>
      <div class="avatar big" :style="{ background: me.car.color }">{{ me.name[0] }}</div>
    </header>

    <section class="shrine">
      <svg class="gopuram" viewBox="0 0 100 140" aria-hidden="true">
        <path d="M48 6h4v8h-4z M44 14h12l-2 6H46z M40 20h20l3 14H37z M33 34h34l5 18H28z M25 52h50l6 20H19z M16 72h68l7 22H9z M6 94h88v46H6z" />
      </svg>
      <template v-if="left > 0">
        <div class="eyebrow light">Departure in</div>
        <div class="digits">
          <div v-for="u in units" :key="u.label" class="digit">
            <div class="num display">{{ String(u.value).padStart(2, '0') }}</div>
            <div class="unit">{{ u.label }}</div>
          </div>
        </div>
      </template>
      <div v-else class="started display">On the yatra 🛕<br /><span>Govinda Govinda!</span></div>
      <div class="when"><q-icon name="event" size="16px" /> {{ departure }} from Warje</div>
    </section>

    <section class="strip">
      <div class="strip-head"><span class="display">Convoy progress</span><small class="muted">{{ progressNote }}</small></div>
      <div class="legs">
        <button v-for="l in LEGS" :key="l.key" :class="{ on: legKey === l.key }" @click="setLeg(l.key)">
          {{ l.label }}<small>{{ totalKm(l).toLocaleString('en-IN') }} km</small>
        </button>
      </div>
      <div class="rail">
        <div class="line" />
        <div class="done" :style="{ width: pct(lead) }" />
        <span v-for="(s, i) in railStops" :key="s.name" class="stop" :class="{ hit: lead >= s.km, small: !s.label, first: !i, last: i === railStops.length - 1 }" :style="{ left: pct(s.km) }">
          <i v-if="s.label">{{ s.name }}</i>
        </span>
        <span v-for="c in liveCars" :key="c.id" class="chip" :style="{ left: pct(carStats[c.id].km), background: c.color, borderTopColor: c.color }">{{ c.name[0] }}</span>
      </div>
      <router-link to="/map" class="go-map"><q-icon name="map" size="18px" /> Open live map</router-link>
    </section>

    <section v-if="otherCar" class="pings">
      <div class="pings-h"><span class="display">Ping the {{ otherCar.name }}</span><small class="muted">they get a pop-up</small></div>
      <div class="pings-row">
        <button v-for="[e, t] in PINGS" :key="t" :disabled="sending === t" @click="sendPing(e, t)"><span>{{ e }}</span>{{ t }}</button>
      </div>
      <div v-if="pings.length" class="pings-log">
        <div v-for="p in pings.slice(0, 2)" :key="p.id">
          {{ p.from_car === me.car.id ? 'You' : carName(p.from_car) }}: <b>{{ p.emoji }} {{ p.msg }}</b> · {{ ago(p.created_at, now) }}
          <span v-if="p.ack_by" class="ack">· {{ p.ack_by }} 👍</span>
        </div>
      </div>
    </section>

    <router-link to="/money" class="mcard">
      <span class="ic display">₹</span>
      <span class="mid">
        <b class="display">{{ inr(money.total) }} spent</b>
        <span v-if="!expenses.length" class="muted">No expenses yet. Add the first one.</span>
        <span v-else-if="Math.abs(myNet) < 1" class="muted">{{ me.family }} is all square</span>
        <span v-else-if="myNet > 0" class="gets">{{ me.family }} gets back {{ inr(myNet) }}</span>
        <span v-else class="owes">{{ me.family }} owes {{ inr(-myNet) }}</span>
      </span>
      <q-icon name="chevron_right" size="22px" class="muted" />
    </router-link>

    <div class="sec"><h3 class="display">The convoy</h3><small class="muted">{{ members.length }} yatris · {{ cars.length }} cars</small></div>

    <router-link v-for="c in myCarFirst" :key="c.id" :to="`/car/${c.id}`" class="vcard"
      :class="{ moving: carStats[c.id]?.moving }" :style="{ '--c': c.color }">
      <div class="vband">
        <div class="sun" /><div class="road" />
        <div class="txt">
          <div class="eyebrow light">{{ crew(c.id).length }} {{ crew(c.id).length === 1 ? 'yatri' : 'yatris' }} on board</div>
          <div class="name display">{{ c.name }}</div>
        </div>
        <span v-if="c.id === me.car.id" class="ribbon">Your car</span>
        <CarArt class="art" :kind="c.kind" :color="c.color" />
      </div>
      <div class="vbody">
        <span class="status">
          <b><i class="dot" />{{ carStatus(c.id)[0] }}</b>
          <span>{{ carStatus(c.id)[1] }}</span>
        </span>
        <span class="stack">
          <span v-for="p in crew(c.id).slice(0, 4)" :key="p.id">{{ p.name[0] }}</span>
          <span v-if="crew(c.id).length > 4" class="more">+{{ crew(c.id).length - 4 }}</span>
        </span>
        <q-icon name="chevron_right" size="22px" class="muted" />
      </div>
    </router-link>

    <div v-if="sos" class="sheet-bg" @click.self="sos = false">
      <div class="sheet-in">
        <div class="grab" /><button class="pclose" aria-label="Close" @click="sos = false">✕</button>
        <div class="eyebrow">Emergency</div>
        <h2>Help on the road</h2>
        <q-btn unelevated no-caps class="sos-share" :loading="sending === 'SOS'" label="📍 Send SOS + my location to both cars" @click="sendPing('🆘', 'SOS · need help', true)" />
        <div class="sos-list">
          <a v-for="h in HELP" :key="h.n" :href="`tel:${h.tel}`"><span class="n" :class="{ soft: h.soft }">{{ h.n }}</span><span><b>{{ h.t }}</b><small>{{ h.s }}</small></span></a>
        </div>
        <p v-if="nextTown" class="note">Next big town ahead: <b>{{ nextTown.name }}</b>, {{ fmtKm(nextTown.km - myStats.km) }} away.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, me } from '../supabase'
import { LEGS, totalKm } from '../route'
import { legKey, leg, setLeg, cars, members, crew, myCarFirst, carStats, carStatus, expenses, familySize, perPerson, startTrip, otherCar, pings } from '../trip'
import { Notify } from 'quasar'
import { PINGS } from '../games/data'
import { ledger } from '../ledger'
import { inr, km as fmtKm, ago } from '../format'
import CarArt from '../components/CarArt.vue'

const now = ref(Date.now())
let timer
const start = new Date(me.value.trip.starts_at)
const left = computed(() => start - now.value)
const units = computed(() => {
  const s = Math.max(0, Math.floor(left.value / 1000))
  return [
    { label: 'Days', value: Math.floor(s / 86400) },
    { label: 'Hrs', value: Math.floor(s / 3600) % 24 },
    { label: 'Min', value: Math.floor(s / 60) % 60 },
    { label: 'Sec', value: s % 60 },
  ]
})
const departure = start.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

const total = computed(() => totalKm(leg.value))
const pct = (k) => `${Math.min(100, Math.max(0, (k / total.value) * 100))}%`
const liveCars = computed(() => cars.value.filter((c) => carStats.value[c.id]?.live))
const lead = computed(() => Math.max(0, ...liveCars.value.map((c) => carStats.value[c.id].km)))
// Label only towns far enough apart to fit on a phone-width rail; the rest are small dots.
const RAIL_LABELS = { out: ['Warje', 'Solapur', 'Kurnool', 'Tirumala'], back: ['Tirumala', 'Srisailam', 'Humnabad', 'Warje'] }
const railStops = computed(() => leg.value.stops.filter((s) => s.major).map((s) => ({ ...s, label: RAIL_LABELS[legKey.value].includes(s.name) })))
const progressNote = computed(() => {
  if (!liveCars.value.length) return 'Waiting for live locations'
  const gap = carStats.value[liveCars.value[0].id].gap
  return `${Math.round(lead.value).toLocaleString('en-IN')} of ${total.value.toLocaleString('en-IN')} km${gap !== null ? ` · gap ${fmtKm(gap)}` : ''}`
})

const money = computed(() => ledger(expenses.value, familySize.value, perPerson.value))
const myNet = computed(() => money.value.bal[me.value.family]?.net ?? 0)

const carName = (id) => cars.value.find((c) => c.id === id)?.name ?? 'Other car'
const sending = ref(null)
async function sendPing(emoji, msg, isSos = false) {
  sending.value = isSos ? 'SOS' : msg
  const { data, error } = await supabase.from('pings')
    .insert({ trip_id: me.value.trip.id, from_car: me.value.car.id, emoji, msg, created_by: me.value.id }).select().single()
  sending.value = null
  if (error) return Notify.create({ type: 'negative', message: 'Could not send. Check your internet.', position: 'top' })
  if (!pings.value.some((p) => p.id === data.id)) pings.value = [data, ...pings.value]
  if (isSos) sos.value = false
  Notify.create({ type: 'positive', message: isSos ? 'SOS sent to both cars. Your live location is on the map.' : `Sent to ${otherCar.value.name}: ${msg}`, position: 'top', timeout: 1800 })
}

const sos = ref(false)
const HELP = [
  { n: '112', tel: '112', t: 'Police / any emergency', s: 'All-India emergency number' },
  { n: '108', tel: '108', t: 'Ambulance', s: 'Free in Maharashtra, Karnataka, Telangana and Andhra' },
  { n: '1033', tel: '1033', t: 'Highway helpline (NHAI)', s: 'Breakdown, crash or towing on a national highway' },
  { n: '🛕', tel: '18004254141', t: 'TTD helpline', s: '1800 425 4141 · darshan, lost & found in Tirumala', soft: true },
]
const myStats = computed(() => carStats.value[me.value.car.id])
const nextTown = computed(() => myStats.value?.live ? leg.value.stops.find((s) => s.major && s.km > myStats.value.km) : null)

onMounted(() => {
  startTrip()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.hello { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.who { flex: 1; min-width: 0; }
.hi { font-size: 15px; }
.me { font-size: 34px; margin-top: 2px; }
.sos { border: 0; border-radius: 14px; padding: 8px 12px; background: var(--sindoor); color: #fff; font: inherit; font-weight: 800; font-size: 13px; letter-spacing: .08em; cursor: pointer; box-shadow: 0 8px 18px -8px rgba(181, 18, 27, .7); }
.pings { margin-top: 14px; padding: 12px 14px 14px; border-radius: 22px; background: var(--card); border: 1px solid var(--line); }
.pings-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.pings-h .display { font-size: 19px; }
.pings-h small { font-size: 12px; }
.pings-row { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -14px; padding: 0 14px; }
.pings-row::-webkit-scrollbar { display: none; }
.pings-row button { flex: none; border: 2px solid var(--line); background: var(--bg); border-radius: 16px; padding: 8px 12px; display: grid; justify-items: center; gap: 2px; font: inherit; font-size: 12px; font-weight: 700; color: var(--ink); min-width: 70px; cursor: pointer; }
.pings-row button span { font-size: 20px; line-height: 1; }
.pings-row button:active { border-color: var(--marigold); background: #FFF1DA; }
.pings-row button:disabled { opacity: .5; }
.pings-log { margin-top: 10px; display: grid; gap: 4px; font-size: 12px; color: var(--ink-2); }
.pings-log b { color: var(--ink); }
.pings-log .ack { color: var(--ok); font-weight: 700; }
.sos-share { width: 100%; border-radius: 16px; padding: 8px; margin-bottom: 10px; background: var(--sindoor); color: #fff; font-weight: 800; font-size: 15px; }
.sos-list { display: grid; gap: 8px; }
.sos-list a { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 10px 12px; }
.sos-list .n { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; flex: none; font-family: 'Rozha One', serif; font-size: 17px; color: #fff; background: var(--sindoor); }
.sos-list .n.soft { background: var(--sandal); font-size: 20px; }
.sos-list b { display: block; font-size: 15px; }
.sos-list small { font-size: 12px; color: var(--ink-2); }
.avatar.big { width: 50px; height: 50px; font-size: 22px; font-family: 'Rozha One', serif; font-weight: 400; box-shadow: 0 0 0 3px var(--bg), 0 0 0 5px var(--gold); }
a { color: inherit; text-decoration: none; }

/* Countdown shrine */
.shrine {
  position: relative; overflow: hidden; border-radius: 28px; padding: 30px 16px 16px; color: #FFE7B0;
  background: var(--jaali), radial-gradient(120% 90% at 85% 0%, #8E1A24 0%, var(--kumkum) 62%);
  box-shadow: 0 24px 44px -22px rgba(90, 11, 22, .65);
}
.shrine::before { content: ""; position: absolute; inset: 0 0 auto; height: 14px; background: var(--scallop); }
.gopuram { position: absolute; right: -4px; bottom: 0; width: 112px; fill: var(--gold); opacity: .14; }
.shrine > *:not(.gopuram) { position: relative; }
.eyebrow.light { color: rgba(255, 231, 176, .72); }
.digits { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 8px; }
.digit { text-align: center; border-radius: 15px; padding: 9px 0 7px; background: rgba(255, 214, 120, .1); border: 1px solid rgba(255, 214, 120, .3); }
.num { font-size: 36px; color: var(--gold); font-variant-numeric: tabular-nums; }
.unit { font-size: 10px; font-weight: 600; letter-spacing: .06em; opacity: .75; }
.started { font-size: 32px; color: var(--gold); }
.started span { font-size: 19px; color: #FFE7B0; }
.when { margin-top: 12px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }

/* Convoy progress strip */
.strip { margin-top: 14px; padding: 14px 14px 12px; border-radius: 22px; background: var(--card); border: 1px solid var(--line); }
.strip-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.strip-head .display { font-size: 20px; }
.strip-head small { font-size: 12px; text-align: right; }
.legs { display: flex; gap: 6px; margin: 10px 0 2px; }
.legs button {
  flex: 1; display: flex; justify-content: space-between; align-items: baseline; gap: 6px;
  border: 1.5px solid var(--line); background: var(--card); border-radius: 12px; padding: 6px 10px;
  font: inherit; font-size: 13px; font-weight: 700; color: var(--ink-2); cursor: pointer;
}
.legs button small { font-weight: 600; font-size: 11px; }
.legs button.on { border-color: var(--sindoor); color: var(--sindoor); background: #FFF1EA; }
.rail { position: relative; height: 54px; margin: 6px 8px 0; }
.rail .line { position: absolute; left: 0; right: 0; top: 26px; height: 4px; border-radius: 2px; background: repeating-linear-gradient(90deg, #E6CFA6 0 8px, transparent 8px 12px); }
.rail .done { position: absolute; left: 0; top: 26px; height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--gold), var(--marigold)); }
.rail .stop { position: absolute; top: 22px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: var(--card); border: 2.5px solid #D9BE90; box-sizing: border-box; }
.rail .stop.small { width: 8px; height: 8px; margin-left: -4px; top: 24px; border-width: 2px; }
.rail .stop.hit { border-color: var(--marigold); background: var(--marigold); }
.rail .stop i { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 10px; font-weight: 600; color: var(--ink-2); white-space: nowrap; }
.rail .stop.first i { left: -4px; transform: none; }
.rail .stop.last i { left: auto; right: -4px; transform: none; }
.rail .chip { position: absolute; top: 0; transform: translateX(-50%); height: 20px; min-width: 20px; padding: 0 6px; border-radius: 10px; color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; box-shadow: 0 0 0 2px var(--card); box-sizing: border-box; transition: left .5s; }
.rail .chip::after { content: ""; position: absolute; left: 50%; bottom: -5px; margin-left: -4px; border: 4px solid transparent; border-top-color: inherit; border-bottom: 0; }
.go-map { margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 14px; padding: 10px; background: var(--kumkum); color: #FFE7B0; font-weight: 700; font-size: 14px; }

/* Money card */
.mcard { margin-top: 14px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 22px; padding: 14px; background: var(--card); }
.mcard .ic { width: 46px; height: 46px; border-radius: 15px; background: var(--kumkum); display: grid; place-items: center; color: var(--gold); font-size: 24px; flex: none; }
.mcard .mid { flex: 1; min-width: 0; display: grid; }
.mcard b { font-size: 23px; line-height: 1.1; font-weight: 400; }
.mcard span { font-size: 13px; }
.gets { color: var(--ok); font-weight: 700; }
.owes { color: var(--sindoor); font-weight: 700; }

.sec { display: flex; align-items: baseline; justify-content: space-between; margin: 26px 2px 12px; }
.sec h3 { font-size: 25px; }
.sec h3::after { content: " ✦"; color: var(--marigold); font-size: .55em; vertical-align: middle; }
.sec small { font-size: 13px; }

/* Car cards */
.vcard { display: block; border: 1px solid var(--line); border-radius: 26px; overflow: hidden; background: var(--card); box-shadow: 0 16px 30px -18px rgba(90, 11, 22, .35); margin-bottom: 14px; transition: transform .15s; }
.vcard:active { transform: scale(.985); }
.vband { position: relative; height: 150px; overflow: hidden; color: #fff; background: var(--jaali), linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 40%, var(--kumkum))); }
.vband::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 14px; background: var(--scallop); transform: scaleY(-1); }
.sun { position: absolute; right: -40px; top: -60px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 214, 120, .45), transparent 65%); }
.road { position: absolute; left: 0; right: 0; bottom: 14px; height: 22px; background: rgba(0, 0, 0, .18); }
.road::before { content: ""; position: absolute; left: 0; right: 0; top: 10px; height: 2px; background: repeating-linear-gradient(90deg, rgba(255, 231, 176, .6) 0 14px, transparent 14px 28px); }
.moving .road::before { animation: road .5s linear infinite; }
@keyframes road { to { background-position: -28px 0; } }
.art { position: absolute; right: 10px; bottom: 18px; width: 200px; }
.moving .art { animation: bob .6s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-1.5px); } }
.txt { position: absolute; left: 16px; top: 14px; }
.txt .eyebrow.light { color: rgba(255, 255, 255, .8); }
.name { font-size: 36px; margin-top: 4px; text-shadow: 0 2px 12px rgba(0, 0, 0, .25); }
.ribbon { position: absolute; right: 12px; top: 12px; z-index: 2; background: var(--gold); color: var(--kumkum); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
.vbody { display: flex; align-items: center; gap: 10px; padding: 14px 12px 14px 16px; }
.status { flex: 1; min-width: 0; display: grid; gap: 2px; }
.status b { font-size: 15px; display: flex; align-items: center; gap: 6px; }
.status span { font-size: 13px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #B9A58C; flex: none; }
.moving .dot { background: var(--ok); animation: ping 1.6s ease-out infinite; }
@keyframes ping { 0% { box-shadow: 0 0 0 0 rgba(31, 138, 76, .5); } 100% { box-shadow: 0 0 0 8px rgba(31, 138, 76, 0); } }
.stack { display: flex; padding-left: 9px; }
.stack span { width: 30px; height: 30px; margin-left: -9px; border-radius: 50%; display: grid; place-items: center; font-family: 'Rozha One', serif; font-size: 13px; color: #fff; background: linear-gradient(140deg, var(--c), color-mix(in srgb, var(--c) 50%, var(--kumkum))); box-shadow: 0 0 0 2px var(--card); }
.stack span.more { background: var(--sandal); color: var(--ink); font-family: inherit; font-weight: 700; font-size: 11px; }
@media (prefers-reduced-motion: reduce) { .moving .road::before, .moving .art, .moving .dot { animation: none; } }
</style>
