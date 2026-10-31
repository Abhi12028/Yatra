// Run: node tests/check.mjs — self-checks for the route maths and the expense settle-up.
import assert from 'node:assert/strict'
import { LEGS, project, pathTo, nextStop, totalKm } from '../src/route.js'
import { ledger } from '../src/ledger.js'

// Route: totals match the notes; towns snap to their own km; midpoints land between.
assert.equal(totalKm(LEGS.out), 1032)
assert.equal(LEGS.back.stops.reduce((s, x, i, a) => (i ? s + (x.km - a[i - 1].km) : 0), 0), 1353)
for (const leg of Object.values(LEGS)) for (const s of leg.stops) assert.ok(Math.abs(project(leg, s.lat, s.lng).km - s.km) < 1, `${leg.key} ${s.name}`)
const mid = project(LEGS.out, (18.48 + 18.12) / 2, (73.80 + 75.02) / 2)
assert.ok(mid.km > 60 && mid.km < 80 && mid.off < 1, 'Warje–Indapur midpoint')
assert.equal(nextStop(LEGS.out, 250).name, 'Akkalkot')
assert.deepEqual(pathTo(LEGS.out, 0), [[18.48, 73.80]])
assert.equal(pathTo(LEGS.out, 300).length, 5) // Warje, Indapur, Solapur, Akkalkot + a point toward Kalaburagi

// Ledger: after the suggested payments every family is even, in both split modes.
const size = { Sutar: 4, Squad: 4, Dada: 6 }, all = Object.keys(size)
const ex = [
  { amount: 4200, paid_by: 'Sutar', split: all }, { amount: 780, paid_by: 'Dada', split: all },
  { amount: 1800, paid_by: 'Dada', split: ['Dada'] }, { amount: 4200, paid_by: 'Squad', split: all },
]
for (const perPerson of [true, false]) {
  const { bal, pay, total } = ledger(ex, size, perPerson)
  assert.equal(total, 10980)
  const after = Object.fromEntries(Object.entries(bal).map(([f, b]) => [f, b.net]))
  pay.forEach((p) => { after[p.from] += p.amount; after[p.to] -= p.amount })
  Object.values(after).forEach((v) => assert.ok(Math.abs(v) < 1, JSON.stringify(after)))
}
assert.equal(ledger([], size, true).pay.length, 0)
console.log('ok: route + ledger')
