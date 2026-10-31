import { ref } from 'vue'
import { supabase, me } from './supabase'

const KEY = 'yatra.sharing'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }

export const sharing = ref(read() !== 'off')
export const gpsError = ref('')

let watchId = null
let last = null

export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

// ponytail: foreground watchPosition; the APK swaps this for a background-geolocation plugin
export function startTracking() {
  if (watchId !== null || !sharing.value || !me.value) return
  if (!navigator.geolocation) return (gpsError.value = 'Location is not available on this device.')
  watchId = navigator.geolocation.watchPosition(send, (e) => {
    gpsError.value = e.code === 1 ? 'Location permission is blocked. Allow it in your browser settings.' : 'Waiting for a GPS signal…'
  }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 })
}

export function setSharing(on) {
  sharing.value = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode: setting just won't persist */ }
  if (on) return startTracking()
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  gpsError.value = ''
}

async function send(pos) {
  gpsError.value = ''
  const { latitude: lat, longitude: lng, accuracy, speed, heading } = pos.coords
  // Battery + data: send at most every 30 s, unless moved more than 50 m.
  if (last && pos.timestamp - last.t < 30000 && distanceKm(last, { lat, lng }) < 0.05) return
  const { error } = await supabase.from('locations').upsert({
    member_id: me.value.id,
    trip_id: me.value.trip.id,
    lat, lng, accuracy, speed, heading,
    updated_at: new Date(pos.timestamp).toISOString(),
  })
  if (!error) last = { lat, lng, t: pos.timestamp } // on failure (offline) the next fix retries
}
