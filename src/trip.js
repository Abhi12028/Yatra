// One live store for the whole trip: cars, people, GPS positions, headcount and expenses.
// Loaded once after login and kept in sync with Supabase Realtime; every page reads from here.
import { ref, computed } from 'vue'
import { supabase, me } from './supabase'
import { LEGS, project, nextStop, totalKm } from './route'
import { km as fmtKm, hours, ago } from './format'

const LIVE_MS = 10 * 60 * 1000 // a position older than this is "last seen", not live
const store = (key) => ({
  get: () => { try { return localStorage.getItem(key) } catch { return null } },
  set: (v) => { try { localStorage.setItem(key, v) } catch { /* private mode: just won't persist */ } },
})
const legPref = store('yatra.leg')
const splitPref = store('yatra.split')

export const legKey = ref(LEGS[legPref.get()] ? legPref.get() : 'out')
export const leg = computed(() => LEGS[legKey.value])
export function setLeg(k) { legKey.value = k; legPref.set(k) }

export const perPerson = ref(splitPref.get() !== 'family')
export function setPerPerson(on) { perPerson.value = on; splitPref.set(on ? 'person' : 'family') }

export const cars = ref([]) // [{ id, name, color, kind }]
export const members = ref([]) // [{ id, name, family, car_id }]
export const locs = ref({}) // member_id → { lat, lng, speed, updated_at }
export const outOfCar = ref({}) // member_id → true when ticked out (no row = in the car)
export const expenses = ref([]) // newest first
export const points = ref([]) // game points, newest first
export const pings = ref([]) // newest first
export const pack = ref([]) // packing list, oldest first
export const docs = ref([])
export const now = ref(Date.now())

// Apply one realtime change to a list, keeping its order (new rows go last).
const upsertRow = (list, eventType, x, old) => eventType === 'DELETE' ? list.filter((y) => y.id !== old.id)
  : list.some((y) => y.id === x.id) ? list.map((y) => (y.id === x.id ? x : y)) : [...list, x]

let started = null
export function startTrip() {
  return (started ??= (async () => {
    const [c, m, l, h, e, gp, pg, pk, dc] = await Promise.all([
      supabase.from('cars').select('id, name, color, kind').order('name'),
      supabase.from('members').select('id, name, family, car_id').order('name'),
      supabase.from('locations').select('member_id, lat, lng, speed, updated_at'),
      supabase.from('car_headcount').select('member_id, in_car'),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('game_points').select('*').order('created_at', { ascending: false }),
      supabase.from('pings').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('pack_items').select('*').order('created_at'),
      supabase.from('docs').select('*').order('created_at'),
    ])
    cars.value = c.data ?? []
    members.value = m.data ?? []
    locs.value = Object.fromEntries((l.data ?? []).map((x) => [x.member_id, x]))
    outOfCar.value = Object.fromEntries((h.data ?? []).filter((x) => !x.in_car).map((x) => [x.member_id, true]))
    expenses.value = e.data ?? []
    points.value = gp.data ?? []
    pings.value = pg.data ?? []
    pack.value = pk.data ?? []
    docs.value = dc.data ?? []

    const on = (table, fn) => ['postgres_changes', { event: '*', schema: 'public', table }, fn]
    supabase.channel('trip')
      .on(...on('locations', ({ new: x }) => x.member_id && (locs.value = { ...locs.value, [x.member_id]: x })))
      .on(...on('car_headcount', ({ new: x }) => {
        if (!x.member_id) return
        const next = { ...outOfCar.value }
        x.in_car ? delete next[x.member_id] : (next[x.member_id] = true)
        outOfCar.value = next
      }))
      .on(...on('expenses', ({ eventType, new: x, old }) => {
        if (eventType === 'DELETE') expenses.value = expenses.value.filter((y) => y.id !== old.id)
        else if (!expenses.value.some((y) => y.id === x.id)) expenses.value = [x, ...expenses.value]
      }))
      .on(...on('game_points', ({ new: x }) => x.id && !points.value.some((y) => y.id === x.id) && (points.value = [x, ...points.value])))
      .on(...on('pings', ({ new: x }) => x.id && (pings.value = [x, ...pings.value.filter((y) => y.id !== x.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)))))
      .on(...on('pack_items', ({ eventType, new: x, old }) => (pack.value = upsertRow(pack.value, eventType, x, old))))
      .on(...on('docs', ({ eventType, new: x, old }) => (docs.value = upsertRow(docs.value, eventType, x, old))))
      .on(...on('members', ({ new: x }) => x.id && !members.value.some((y) => y.id === x.id) && (members.value = [...members.value, x])))
      .subscribe()
    setInterval(() => (now.value = Date.now()), 30000)
  })())
}

export const myCarFirst = computed(() => [...cars.value].sort((a, b) => (b.id === me.value?.car.id) - (a.id === me.value?.car.id)))
export const crew = (carId) => members.value.filter((p) => p.car_id === carId)
export const isLive = (loc) => loc && now.value - new Date(loc.updated_at) < LIVE_MS

// Per car: the live person in the middle of the pack (median km along the leg) stands for the car.
// Not an average: one phone left at home or in a dhaba would drag an average halfway across the map.
export const carStats = computed(() => {
  const L = leg.value
  const stats = Object.fromEntries(cars.value.map((c) => {
    const live = crew(c.id).map((p) => locs.value[p.id]).filter(isLive)
    if (!live.length) {
      const seen = crew(c.id).map((p) => locs.value[p.id]).filter(Boolean).map((x) => new Date(x.updated_at)).sort((a, b) => b - a)[0]
      return [c.id, { live: false, lastSeen: seen ?? null }]
    }
    const snapped = live.map((x) => ({ x, p: project(L, x.lat, x.lng) })).sort((a, b) => a.p.km - b.p.km)
    const { x: mid, p } = snapped[Math.floor((snapped.length - 1) / 2)]
    const { lat, lng } = mid
    const kmh = (mid.speed || 0) * 3.6
    const next = nextStop(L, p.km)
    return [c.id, {
      live: true, lat, lng, kmh, km: p.km, angle: p.angle, offRoute: p.off > 25, sharing: live.length,
      moving: kmh > 5, next, etaH: next && kmh > 5 ? (next.km - p.km) / kmh : null, done: p.km >= totalKm(L) - 0.5,
    }]
  }))
  const on = Object.values(stats).filter((s) => s.live)
  const gap = on.length === 2 ? Math.abs(on[0].km - on[1].km) : null
  Object.values(stats).forEach((s) => (s.gap = gap))
  if (gap !== null) {
    const lead = Math.max(on[0].km, on[1].km)
    on.forEach((s) => (s.ahead = s.km === lead))
  }
  return stats
})

export async function setInCar(memberIds, inCar) {
  const rows = memberIds.map((id) => ({ member_id: id, trip_id: me.value.trip.id, in_car: inCar, updated_at: new Date().toISOString() }))
  const prev = outOfCar.value
  const next = { ...prev }
  memberIds.forEach((id) => (inCar ? delete next[id] : (next[id] = true)))
  outOfCar.value = next // optimistic; realtime confirms
  const { error } = await supabase.from('car_headcount').upsert(rows)
  if (error) outOfCar.value = prev
  return error
}

export const familySize = computed(() => members.value.reduce((m, p) => ((m[p.family] = (m[p.family] || 0) + 1), m), {}))
export const families = computed(() => Object.keys(familySize.value).sort())

// Two-line status for a car card: [headline, detail].
export function carStatus(carId) {
  const s = carStats.value[carId], L = leg.value
  if (!s) return ['', '']
  if (!s.live) return [s.lastSeen ? 'Not sharing right now' : 'No location yet', s.lastSeen ? `Last seen ${ago(s.lastSeen, now.value)}` : 'Turn on location sharing in Live map']
  if (s.done) return [`Reached ${L.to}`, L.to === 'Warje' ? 'Home safe 🙏' : 'Govinda Govinda! 🛕']
  if (s.offRoute) return ['Off the route', `Nearest: ${Math.round(s.km)} km along the ${L.label.toLowerCase()} route`]
  const rel = s.gap === null ? '' : s.gap < 0.3 ? ' · side by side' : ` · ${fmtKm(s.gap)} ${s.ahead ? 'ahead' : 'behind'}`
  if (!s.moving) return [s.km < 1 ? `Parked in ${L.from}` : `Stopped · ${fmtKm(s.km)} done`, `${s.next ? `Next: ${s.next.name}` : ''}${rel}`]
  return [`Moving · ${Math.round(s.kmh)} km/h`, `${s.next.name} in ${hours(s.etaH)}${rel}`]
}

export const otherCar = computed(() => cars.value.find((c) => c.id !== me.value?.car.id))
export const score = computed(() => points.value.reduce((m, p) => ((m[p.car_id] = (m[p.car_id] || 0) + p.points), m), {}))
export async function addPoint(carId, game, what, n = 1) {
  const { data, error } = await supabase.from('game_points')
    .insert({ trip_id: me.value.trip.id, car_id: carId, game, what: what.slice(0, 80), points: n, created_by: me.value.id }).select().single()
  if (!error && !points.value.some((y) => y.id === data.id)) points.value = [data, ...points.value]
  return error
}
