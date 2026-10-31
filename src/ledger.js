// Who owes whom. expenses: [{ amount, paid_by, split: [family] }], size: { family: people }.
// perPerson: a family's share is weighted by its head count; otherwise every family in the split pays equally.
export function ledger(expenses, size, perPerson) {
  const families = [...new Set([...Object.keys(size), ...expenses.flatMap((e) => [e.paid_by, ...e.split])])]
  const bal = Object.fromEntries(families.map((f) => [f, { paid: 0, share: 0, net: 0 }]))
  for (const e of expenses) {
    bal[e.paid_by].paid += e.amount
    const w = e.split.map((f) => (perPerson ? Math.max(size[f] || 0, 1) : 1))
    const W = w.reduce((a, b) => a + b, 0)
    e.split.forEach((f, i) => (bal[f].share += (e.amount * w[i]) / W))
  }
  families.forEach((f) => (bal[f].net = bal[f].paid - bal[f].share))

  // Fewest payments: the biggest debtor pays the biggest creditor until everyone is even.
  const cred = families.filter((f) => bal[f].net > 0.5).map((f) => ({ f, v: bal[f].net })).sort((a, b) => b.v - a.v)
  const debt = families.filter((f) => bal[f].net < -0.5).map((f) => ({ f, v: -bal[f].net })).sort((a, b) => b.v - a.v)
  const pay = []
  while (cred.length && debt.length) {
    const c = cred[0], d = debt[0], v = Math.min(c.v, d.v)
    pay.push({ from: d.f, to: c.f, amount: Math.round(v) })
    c.v -= v
    d.v -= v
    if (c.v < 0.5) cred.shift()
    if (d.v < 0.5) debt.shift()
  }
  return { bal, pay, total: expenses.reduce((a, e) => a + e.amount, 0) }
}
