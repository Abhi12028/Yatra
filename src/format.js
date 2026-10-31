export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
export const km = (k) => (k < 1 ? Math.round(k * 1000) + ' m' : k < 10 ? k.toFixed(1) + ' km' : Math.round(k).toLocaleString('en-IN') + ' km')
export const hours = (h) => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} m` }
export function ago(date, now = Date.now()) {
  const m = Math.floor((now - new Date(date)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return m < 1440 ? `${Math.floor(m / 60)} hr ago` : `${Math.floor(m / 1440)} d ago`
}
export const dayLabel = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
