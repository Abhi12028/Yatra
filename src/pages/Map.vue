<template>
  <div class="map-page">
    <div ref="mapEl" class="map" />

    <header ref="topEl" class="top">
      <div class="t">
        <div class="eyebrow">{{ leg.label }} · {{ leg.from }} → {{ leg.to }}</div>
        <h2>{{ headline }}</h2>
      </div>
      <div class="seg">
        <button :class="{ on: view === 'map' }" @click="view = 'map'">Map</button>
        <button :class="{ on: view === 'route' }" @click="view = 'route'">Route</button>
      </div>
      <div class="legs">
        <button v-for="l in LEGS" :key="l.key" :class="{ on: legKey === l.key }" @click="setLeg(l.key)">
          {{ l.label }}<small>{{ totalKm(l).toLocaleString('en-IN') }} km</small>
        </button>
      </div>
    </header>

    <div v-show="view === 'map'" class="ctrls" :style="{ top: topH + 12 + 'px' }">
      <button aria-label="Zoom in" @click="map.zoomIn()">+</button>
      <button aria-label="Zoom out" @click="map.zoomOut()">−</button>
      <button aria-label="Show whole route" @click="follow = false; fitLeg()"><q-icon name="fit_screen" size="20px" /></button>
      <button aria-label="Follow selected car" :class="{ on: follow }" :disabled="!sel?.live" @click="toggleFollow"><q-icon name="my_location" size="20px" /></button>
    </div>

    <section v-if="view === 'route'" class="route" :style="{ paddingTop: topH + 16 + 'px' }">
      <div class="rt">
        <div class="fill" :style="{ height: Math.max(kmToY(lead) - 8, 0) + 'px' }" />
        <div v-for="s in leg.stops" :key="s.name" class="rstop" :class="{ hit: lead >= s.km && lead > 0, minor: !s.major }">
          <i class="rdot" />
          <b>{{ s.name }}<span class="mr">{{ s.mr }}</span></b>
          <span>{{ s.est ? '≈' : '' }}{{ s.km.toLocaleString('en-IN') }} km{{ s.note ? ' · ' + s.note : '' }}</span>
        </div>
        <div v-for="(c, i) in liveCars" :key="c.id" class="rcar" :class="{ r2: i }" :style="{ top: kmToY(carStats[c.id].km) + 'px', '--c': c.color }">
          <i>{{ c.name[0] }}</i><span>{{ c.name }} · {{ Math.round(carStats[c.id].km) }} km</span>
        </div>
      </div>
    </section>

    <section ref="sheetEl" class="sheet" :class="{ min: sheetMin }">
      <button class="grab" :aria-label="sheetMin ? 'Show details' : 'Hide details'" @click="sheetMin = !sheetMin" />
      <div v-if="!sharing" class="note">
        Your location is hidden, so your car may look empty.
        <button class="note-btn" @click="setSharing(true)">Share my location</button>
      </div>
      <div v-else-if="gpsError" class="note">{{ gpsError }}</div>

      <div class="pick">
        <button v-for="c in myCarFirst" :key="c.id" :class="{ on: selId === c.id }" :style="{ '--c': c.color }" @click="select(c.id)">
          <i />{{ c.name }}
          <small>{{ !carStats[c.id]?.live ? 'no signal' : carStats[c.id].moving ? Math.round(carStats[c.id].kmh) + ' km/h' : 'stopped' }}</small>
        </button>
      </div>

      <template v-if="sel?.live">
        <div class="stats3">
          <div><b>{{ sel.moving ? Math.round(sel.kmh) : 0 }}</b><span>km/h</span></div>
          <div><b>{{ Math.round(sel.km).toLocaleString('en-IN') }}</b><span>of {{ totalKm(leg).toLocaleString('en-IN') }} km</span></div>
          <div v-if="sel.gap === null"><b>–</b><span>other car offline</span></div>
          <div v-else><b>{{ gapText[0] }}</b><span>{{ gapText[1] }}</span></div>
        </div>
        <div class="next">
          <span class="pin"><q-icon :name="sel.next ? 'place' : 'temple_hindu'" size="18px" /></span>
          <span v-if="sel.next">
            <b>Next: {{ sel.next.name }}</b> <span class="muted">{{ sel.next.mr }}</span>{{ sel.next.note ? ' · ' + sel.next.note : '' }}<br />
            <span class="muted">{{ fmtKm(sel.next.km - sel.km) }} away<template v-if="sel.etaH"> · ETA {{ eta(sel.etaH) }}</template></span>
          </span>
          <span v-else><b>Reached {{ leg.to }}</b><br /><span class="muted">{{ leg.to === 'Warje' ? 'Home safe 🙏' : 'Govinda Govinda 🙏' }}</span></span>
        </div>
      </template>
      <p v-else class="offline muted">
        Nobody in {{ selCar?.name }} is sharing their location{{ sel?.lastSeen ? ` (last seen ${ago(sel.lastSeen)})` : '' }}.
      </p>

      <div class="acts">
        <button :class="{ on: follow }" :disabled="!sel?.live" @click="toggleFollow"><q-icon name="navigation" size="18px" />Follow</button>
        <button @click="$router.push(`/car/${selId}`)"><q-icon name="groups" size="18px" />Headcount</button>
        <button :class="{ on: sharing }" @click="setSharing(!sharing)"><q-icon :name="sharing ? 'location_on' : 'location_off'" size="18px" />{{ sharing ? 'Sharing' : 'Hidden' }}</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { me } from '../supabase'
import { LEGS, totalKm, pathTo } from '../route'
import { legKey, leg, setLeg, cars, myCarFirst, carStats, startTrip } from '../trip'
import { sharing, gpsError, setSharing } from '../tracker'
import { km as fmtKm, ago } from '../format'

const mapEl = ref(null)
const topEl = ref(null)
const sheetEl = ref(null)
const topH = ref(140)
const view = ref('map')
const follow = ref(false)
const sheetMin = ref(false)
const selId = ref(me.value.car.id)
let map, legLayer, doneLine, ro, gapMarker
const stopMarkers = []
const carMarkers = {} // ponytail: Leaflet objects stay outside Vue reactivity on purpose

const selCar = computed(() => cars.value.find((c) => c.id === selId.value))
const sel = computed(() => carStats.value[selId.value])
const liveCars = computed(() => cars.value.filter((c) => carStats.value[c.id]?.live))
const lead = computed(() => Math.max(0, ...liveCars.value.map((c) => carStats.value[c.id].km)))
const gapText = computed(() => {
  const g = sel.value.gap
  if (g < 0.3) return ['0', 'km gap']
  const [n, unit] = fmtKm(g).split(' ')
  return [n, `${unit} ${sel.value.ahead ? 'ahead' : 'behind'}`]
})
const headline = computed(() => {
  const live = liveCars.value
  if (!live.length) return 'Waiting for locations'
  if (live.length === 1) return `${live[0].name} is live`
  const g = carStats.value[live[0].id].gap
  const leader = live.find((c) => carStats.value[c.id].ahead)
  return g < 0.3 ? 'Cars side by side' : `${leader.name} leads by ${fmtKm(g)}`
})
const eta = (h) => new Date(Date.now() + h * 3600000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

// Route view: towns spaced evenly, cars placed between them by km.
const ROW = 62
function kmToY(k) {
  const st = leg.value.stops
  let i = st.findIndex((s, j) => j < st.length - 1 && k <= st[j + 1].km)
  if (i < 0) i = st.length - 2
  return 10 + i * ROW + ((k - st[i].km) / (st[i + 1].km - st[i].km)) * ROW
}

// ---- Leaflet ----
const stopIcon = (s, hit) => L.divIcon({
  className: '',
  iconSize: [0, 0],
  html: `<div class="stp ${s.major ? 'major' : 'minor'} ${hit ? 'hit' : ''}"><i></i><span class="lbl"><b>${s.name}</b>${s.major && s.note ? `<small>${s.note}</small>` : ''}</span></div>`,
})
const carIcon = (c, s, selected) => L.divIcon({
  className: '',
  iconSize: [0, 0],
  html: `<div class="cm ${selected ? 'sel' : ''}" style="--c:${c.color}"><div class="cm-car" style="transform:rotate(${s.angle}deg)"><i></i></div><span class="cm-lab">${c.name}</span></div>`,
})

function fitLeg() {
  map.fitBounds(leg.value.stops.map((s) => [s.lat, s.lng]), {
    paddingTopLeft: [24, topH.value + 24],
    paddingBottomRight: [24, (sheetEl.value?.offsetHeight ?? 260) + 24],
  })
}

function drawLeg() {
  legLayer.clearLayers()
  stopMarkers.length = 0
  const other = LEGS[legKey.value === 'out' ? 'back' : 'out']
  const line = leg.value.stops.map((s) => [s.lat, s.lng])
  L.polyline(other.stops.map((s) => [s.lat, s.lng]), { color: '#0F7C7A', weight: 3, dashArray: '6 7', opacity: .45 }).addTo(legLayer)
  L.polyline(line, { color: '#fff', weight: 10, opacity: .9 }).addTo(legLayer)
  L.polyline(line, { color: '#D9A85B', weight: 5 }).addTo(legLayer)
  doneLine = L.polyline([], { color: '#B5121B', weight: 5 }).addTo(legLayer)
  leg.value.stops.forEach((s) => stopMarkers.push(L.marker([s.lat, s.lng], { icon: stopIcon(s, false), interactive: false }).addTo(legLayer)))
  drawProgress()
}

function drawProgress() {
  doneLine.setLatLngs(pathTo(leg.value, lead.value))
  leg.value.stops.forEach((s, i) => stopMarkers[i]?.setIcon(stopIcon(s, lead.value > 0 && lead.value >= s.km)))
}

function drawCars() {
  const stats = carStats.value
  cars.value.forEach((c) => {
    const s = stats[c.id]
    if (!s?.live) { carMarkers[c.id]?.remove(); delete carMarkers[c.id]; return }
    const icon = carIcon(c, s, c.id === selId.value)
    if (carMarkers[c.id]) carMarkers[c.id].setLatLng([s.lat, s.lng]).setIcon(icon)
    else carMarkers[c.id] = L.marker([s.lat, s.lng], { icon, zIndexOffset: 1000 }).on('click', () => select(c.id, true)).addTo(map)
  })
  const live = liveCars.value
  if (live.length === 2 && stats[live[0].id].gap > 0.5) {
    const [a, b] = live.map((c) => stats[c.id])
    const pos = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]
    const icon = L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="gap-pill">${fmtKm(a.gap)}</div>` })
    gapMarker ? gapMarker.setLatLng(pos).setIcon(icon) : (gapMarker = L.marker(pos, { icon, interactive: false }).addTo(map))
  } else { gapMarker?.remove(); gapMarker = null }
  if (follow.value && sel.value?.live) centerOn(sel.value)
}

// Keep the followed car in the visible band between the header and the sheet.
function centerOn(s) {
  const z = Math.max(map.getZoom(), 11)
  const shift = ((sheetEl.value?.offsetHeight ?? 0) - topH.value) / 2
  const pt = map.project([s.lat, s.lng], z).add([0, shift])
  map.setView(map.unproject(pt, z), z, { animate: true })
}

function select(id, fromMap = false) {
  selId.value = id
  if (fromMap || follow.value) follow.value = !!carStats.value[id]?.live
  drawCars()
}
function toggleFollow() {
  follow.value = !follow.value
  if (follow.value && sel.value?.live) centerOn(sel.value)
}

onMounted(async () => {
  map = L.map(mapEl.value, { zoomControl: false, attributionControl: false, minZoom: 5 })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)
  L.control.attribution({ prefix: false, position: 'bottomleft' }).addAttribution('© OpenStreetMap').addTo(map)
  legLayer = L.layerGroup().addTo(map)
  map.on('dragstart', () => (follow.value = false))
  const zoomClass = () => mapEl.value.classList.toggle('z-close', map.getZoom() >= 8)
  map.on('zoomend', zoomClass)
  ro = new ResizeObserver(() => (topH.value = topEl.value.offsetTop + topEl.value.offsetHeight))
  ro.observe(topEl.value)
  await nextTick()
  drawLeg()
  fitLeg()
  zoomClass()
  await startTrip()
  drawProgress()
  drawCars()
})
onUnmounted(() => { ro?.disconnect(); map?.remove() })

watch(carStats, () => { if (map) { drawCars(); drawProgress() } })
watch(legKey, () => { if (map) { follow.value = false; drawLeg(); fitLeg(); drawCars() } })
watch(view, (v) => v === 'map' && nextTick(() => map.invalidateSize()))
</script>

<style scoped>
.map-page { position: fixed; inset: 0; background: #F3EAD8; }
.map { position: absolute; inset: 0; z-index: 0; }

.top {
  position: absolute; z-index: 5; left: 12px; right: 12px; top: max(12px, env(safe-area-inset-top));
  max-width: 456px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 10px 10px 10px 14px; border-radius: 20px; background: rgba(255, 253, 248, .95);
  backdrop-filter: blur(10px); box-shadow: 0 10px 26px -14px rgba(90, 11, 22, .4);
}
.t { flex: 1; min-width: 0; }
.top h2 { font-size: 19px; margin-top: 2px; }
.seg { display: flex; background: var(--sandal); border-radius: 12px; padding: 3px; }
.seg button { border: 0; background: none; padding: 6px 10px; border-radius: 9px; font: inherit; font-size: 12px; font-weight: 700; color: var(--ink-2); cursor: pointer; }
.seg button.on { background: var(--kumkum); color: #FFE7B0; }
.legs { flex-basis: 100%; display: flex; gap: 6px; }
.legs button {
  flex: 1; display: flex; justify-content: space-between; align-items: baseline; gap: 6px; cursor: pointer;
  border: 1.5px solid var(--line); background: var(--card); border-radius: 12px; padding: 6px 10px;
  font: inherit; font-size: 12px; font-weight: 700; color: var(--ink-2);
}
.legs button small { font-weight: 600; font-size: 11px; }
.legs button.on { border-color: var(--sindoor); color: var(--sindoor); background: #FFF1EA; }

.ctrls { position: absolute; z-index: 5; right: 12px; display: grid; gap: 8px; }
.ctrls button {
  width: 42px; height: 42px; border: 0; border-radius: 14px; background: rgba(255, 253, 248, .95); cursor: pointer;
  box-shadow: 0 8px 20px -10px rgba(90, 11, 22, .45); display: grid; place-items: center;
  font-size: 22px; font-weight: 700; color: var(--kumkum);
}
.ctrls button.on { background: var(--kumkum); color: var(--gold); }
.ctrls button:disabled { opacity: .4; cursor: default; }

.route { position: absolute; inset: 0; z-index: 4; overflow-y: auto; padding: 0 16px 340px; background: var(--jaali), var(--bg); }
.rt { position: relative; padding-left: 34px; max-width: 440px; margin: 0 auto; }
.rt::before { content: ""; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 4px; border-radius: 2px; background: repeating-linear-gradient(#E6CFA6 0 8px, transparent 8px 12px); }
.fill { position: absolute; left: 11px; top: 8px; width: 4px; border-radius: 2px; background: linear-gradient(var(--gold), var(--marigold)); }
.rstop { position: relative; height: 62px; }
.rstop:last-of-type { height: auto; }
.rdot { position: absolute; left: -29px; top: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--card); border: 3px solid #D9BE90; box-sizing: border-box; }
.rstop.hit .rdot { background: var(--marigold); border-color: var(--marigold); }
.rstop.minor .rdot { width: 12px; height: 12px; left: -26px; top: 5px; border-width: 2.5px; }
.rstop b { font-size: 16px; display: block; }
.rstop.minor b { font-size: 14px; font-weight: 600; }
.rstop .mr { font-size: 12px; color: var(--marigold); margin-left: 6px; font-weight: 600; }
.rstop > span { font-size: 12px; color: var(--ink-2); }
.rcar { position: absolute; left: 0; z-index: 2; transform: translateY(-50%); display: flex; align-items: center; gap: 6px; transition: top .5s; }
.rcar i { width: 26px; height: 26px; border-radius: 9px; background: var(--c); color: #fff; font-style: normal; font-size: 11px; font-weight: 700; display: grid; place-items: center; box-shadow: 0 0 0 3px var(--bg); }
.rcar span { font-size: 11px; font-weight: 700; color: var(--c); background: var(--card); padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); }
.rcar.r2 span { margin-left: 120px; }

.sheet {
  position: absolute; z-index: 6; left: 10px; right: 10px; bottom: calc(92px + env(safe-area-inset-bottom));
  max-width: 460px; margin: 0 auto; border-radius: 26px; background: var(--card);
  box-shadow: 0 -10px 40px -16px rgba(90, 11, 22, .45); padding: 6px 14px 14px;
}
.grab { display: block; width: 60px; height: 18px; margin: 0 auto 4px; border: 0; background: none; cursor: pointer; position: relative; }
.grab::after { content: ""; position: absolute; left: 10px; right: 10px; top: 7px; height: 4px; border-radius: 2px; background: var(--line); }
.sheet.min .stats3, .sheet.min .next, .sheet.min .offline, .sheet.min .acts { display: none; }
.note { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; margin-bottom: 10px; border-radius: 14px; background: #FFF1E0; font-size: 13px; }
.note-btn { align-self: flex-start; border: 0; background: var(--kumkum); color: #FFE7B0; border-radius: 10px; padding: 6px 12px; font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
.pick { display: flex; gap: 8px; margin-bottom: 12px; }
.pick button {
  flex: 1; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 14px; cursor: pointer;
  border: 2px solid var(--line); background: var(--card); font: inherit; font-weight: 700; font-size: 14px; color: var(--ink); min-width: 0;
}
.pick button i { width: 12px; height: 12px; border-radius: 50%; background: var(--c); flex: none; }
.pick button.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 10%, white); }
.pick button small { margin-left: auto; font-weight: 600; color: var(--ink-2); font-size: 11px; white-space: nowrap; }
.stats3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stats3 div { background: var(--bg); border-radius: 14px; padding: 8px 10px; min-width: 0; }
.stats3 b { display: block; font-family: 'Rozha One', serif; font-weight: 400; font-size: 22px; line-height: 1.1; font-variant-numeric: tabular-nums; white-space: nowrap; }
.stats3 span { font-size: 11px; color: var(--ink-2); font-weight: 600; }
.next { display: flex; align-items: center; gap: 10px; margin: 10px 2px; font-size: 13px; line-height: 1.35; }
.next .pin { width: 32px; height: 32px; border-radius: 10px; background: var(--sandal); display: grid; place-items: center; flex: none; color: var(--sindoor); }
.next b { font-size: 14px; }
.offline { font-size: 13px; margin: 0 2px 12px; }
.acts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.acts button {
  border: 0; border-radius: 14px; padding: 10px 4px; background: var(--bg); cursor: pointer;
  font: inherit; font-weight: 700; font-size: 12px; display: grid; justify-items: center; gap: 4px; color: var(--ink);
}
.acts button .q-icon { color: var(--kumkum); }
.acts button.on { background: var(--kumkum); color: #FFE7B0; }
.acts button.on .q-icon { color: var(--gold); }
.acts button:disabled { opacity: .45; cursor: default; }
</style>

<style>
/* Leaflet builds these outside Vue's scope, so this block is global. */
.map-page .leaflet-tile-pane { filter: sepia(.22) saturate(.8) contrast(1.03); }
.stp { position: relative; }
.stp i { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px; border-radius: 50%; background: #FFFDF8; border: 3px solid #B5121B; box-sizing: border-box; }
.stp.minor i { left: -5px; top: -5px; width: 10px; height: 10px; border-width: 2px; }
.stp.hit i { background: #F5C24A; }
.stp .lbl { position: absolute; left: 11px; top: -9px; white-space: nowrap; display: grid; line-height: 1.1; text-shadow: 0 0 3px #F3EAD8, 0 0 3px #F3EAD8, 0 0 3px #F3EAD8; }
.stp .lbl b { font: 400 14px 'Rozha One', serif; color: #3B0A12; }
.stp .lbl small { font: 600 10px 'Hind', sans-serif; color: #8A5A4A; }
.stp.minor .lbl { display: none; }
.stp.minor .lbl b { font-size: 12px; }
.z-close .stp.minor .lbl { display: grid; }
.cm { position: relative; }
.cm-car { position: absolute; left: -14px; top: -9px; width: 28px; height: 18px; }
.cm-car i { position: absolute; inset: 0; border-radius: 6px; background: var(--c); border: 2.5px solid #fff; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, .45); box-sizing: border-box; }
.cm-car i::before { content: ""; position: absolute; right: 3px; top: 2px; bottom: 2px; width: 6px; border-radius: 2px; background: #2E2533; opacity: .85; }
.cm-car i::after { content: ""; position: absolute; left: 3px; top: 2px; bottom: 2px; width: 4px; border-radius: 2px; background: #2E2533; opacity: .55; }
.cm.sel::before { content: ""; position: absolute; left: -26px; top: -26px; width: 52px; height: 52px; border-radius: 50%; background: radial-gradient(circle, rgba(245, 194, 74, .6), transparent 70%); animation: halo 1.8s ease-in-out infinite; }
@keyframes halo { 50% { transform: scale(1.25); opacity: .6; } }
.cm-lab { position: absolute; left: 50%; top: -34px; transform: translateX(-50%); padding: 2px 9px; border-radius: 999px; background: var(--c); color: #fff; font: 700 11px 'Hind', sans-serif; white-space: nowrap; box-shadow: 0 0 0 2px #fff; }
.gap-pill { transform: translate(-50%, -50%); display: inline-block; padding: 3px 10px; border-radius: 999px; background: #3B0A12; color: #FFE7B0; font: 700 11px 'Hind', sans-serif; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .cm.sel::before { animation: none; } }
</style>
