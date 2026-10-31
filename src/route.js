// The trip route, from the family's handwritten notes (2026-10-31).
// Going total 1,032 km and every return leg are exact; town-by-town km on the way there are estimates (est: true).

const stops = (rows) => rows.map(([name, mr, km, lat, lng, major, note]) => ({ name, mr, km, lat, lng, major: !!major, note }))

export const LEGS = {
  out: {
    key: 'out', label: 'Going', from: 'Warje', to: 'Tirumala',
    stops: stops([
      ['Warje', 'वारजे', 0, 18.48, 73.80, 1, 'Home · 5:00 am start'],
      ['Indapur', 'इंदापूर', 140, 18.12, 75.02, 0, ''],
      ['Solapur', 'सोलापूर', 250, 17.66, 75.91, 1, ''],
      ['Akkalkot', 'अक्कलकोट', 290, 17.52, 76.20, 0, 'Swami Samarth'],
      ['Kalaburagi', 'कलबुर्गी', 355, 17.33, 76.83, 1, ''],
      ['Mahabubnagar', 'मेहबूबनगर', 555, 16.74, 77.99, 1, ''],
      ['Pebbair', 'पेब्बेर', 610, 16.21, 77.99, 0, ''],
      ['Kurnool', 'करनूल', 665, 15.83, 78.04, 1, ''],
      ['Nandyal', 'नंद्याल', 735, 15.48, 78.48, 0, ''],
      ['Kadapa', 'कडप्पा', 865, 14.47, 78.82, 1, ''],
      ['Rajampet', 'राजमपेट', 920, 14.19, 79.16, 0, ''],
      ['Tirumala', 'तिरुमला', 1032, 13.68, 79.35, 1, 'Balaji darshan 🛕'],
    ]).map((s, i, a) => ({ ...s, est: i > 0 && i < a.length - 1 })),
  },
  back: {
    key: 'back', label: 'Return', from: 'Tirumala', to: 'Warje',
    stops: stops([
      ['Tirumala', 'तिरुमला', 0, 13.68, 79.35, 1, 'Start of return'],
      ['Srisailam', 'श्रीशैलम', 420, 16.07, 78.87, 1, 'Mallikarjuna jyotirlinga'],
      ['Humnabad', 'हुमनाबाद', 917, 17.77, 77.13, 1, ''],
      ['Tuljapur', 'तुळजापूर', 1046, 18.01, 76.07, 1, 'Tulja Bhavani'],
      ['Sonari', 'सोनारी', 1137, 18.30, 75.55, 1, 'Bhairavnath'],
      ['Warje', 'वारजे', 1353, 18.48, 73.80, 1, 'Home 🙏'],
    ]).map((s) => ({ ...s, est: false })),
  },
}

export const totalKm = (leg) => leg.stops.at(-1).km
export const nextStop = (leg, km) => leg.stops.find((s) => s.km > km + 0.01)

// Snap a GPS point onto the leg (straight lines between towns) → km along the route.
// ponytail: town-to-town straight lines, so km is approximate between towns; use real road geometry if it matters.
export function project(leg, lat, lng) {
  const k = Math.cos((lat * Math.PI) / 180) // equirectangular: fine at this scale
  let best = null
  leg.stops.slice(0, -1).forEach((a, i) => {
    const b = leg.stops[i + 1]
    const ax = a.lng * k, ay = a.lat, bx = b.lng * k, by = b.lat, px = lng * k, py = lat
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    const off = Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111 // degrees → km
    if (!best || off < best.off) {
      // screen angle of the road (east = 0°, clockwise), used to turn the car marker
      const angle = (Math.atan2(-(b.lat - a.lat), (b.lng - a.lng) * k) * 180) / Math.PI
      best = { km: a.km + t * (b.km - a.km), off, seg: i, t, angle, lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) }
    }
  })
  return best
}

// Points from the start of the leg up to `km` (for the "done" part of the route line).
export function pathTo(leg, km) {
  const pts = []
  for (let i = 0; i < leg.stops.length; i++) {
    const s = leg.stops[i]
    if (s.km <= km) { pts.push([s.lat, s.lng]); continue }
    const a = leg.stops[i - 1], t = (km - a.km) / (s.km - a.km)
    if (t > 0) pts.push([a.lat + t * (s.lat - a.lat), a.lng + t * (s.lng - a.lng)])
    break
  }
  return pts
}
