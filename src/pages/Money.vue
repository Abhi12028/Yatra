<template>
  <div class="page">
    <header class="ex-head">
      <h1>Expenses</h1>
      <div class="split">
        <button :class="{ on: perPerson }" @click="setPerPerson(true)">Per person</button>
        <button :class="{ on: !perPerson }" @click="setPerPerson(false)">Per family</button>
      </div>
    </header>

    <section class="shrine">
      <svg class="gopuram" viewBox="0 0 100 140" aria-hidden="true"><path d="M48 6h4v8h-4z M44 14h12l-2 6H46z M40 20h20l3 14H37z M33 34h34l5 18H28z M25 52h50l6 20H19z M16 72h68l7 22H9z M6 94h88v46H6z" /></svg>
      <div class="eyebrow light">Total spent</div>
      <div class="tot display">{{ inr(L.total) }}</div>
      <div class="tot-sub">{{ inr(L.total / Math.max(members.length, 1)) }} per person on average · {{ expenses.length }} {{ expenses.length === 1 ? 'expense' : 'expenses' }}</div>
      <template v-if="byCat.length">
        <div class="catbar"><i v-for="[k, v] in byCat" :key="k" :style="{ width: (v / L.total) * 100 + '%', background: CATS[k].c }" /></div>
        <div class="legend"><span v-for="[k, v] in byCat" :key="k"><i :style="{ background: CATS[k].c }" />{{ CATS[k].label }} {{ inr(v) }}</span></div>
      </template>
    </section>

    <section class="box">
      <div class="box-h"><h3>Settle up</h3><small class="muted">fewest payments</small></div>
      <div v-for="p in L.pay" :key="p.from + p.to" class="tx">
        <span class="fam" :style="{ background: famColor(p.from) }">{{ ab(p.from) }}</span>
        <span class="who"><b>{{ p.from }}</b><span class="muted">pays <b class="arrow">→</b> {{ p.to }}</span></span>
        <span class="amt display">{{ inr(p.amount) }}</span>
      </div>
      <p v-if="!L.pay.length" class="settled">{{ expenses.length ? 'Everyone is even 🙏' : 'Nothing to settle yet.' }}</p>
    </section>

    <section class="box">
      <div class="box-h"><h3>Families</h3><small class="muted">paid vs share</small></div>
      <div v-for="f in families" :key="f" class="balrow">
        <span class="fam" :style="{ background: famColor(f) }">{{ ab(f) }}</span>
        <span class="mid">
          <span class="nm">{{ f }}</span> <span class="muted sub">· {{ familySize[f] }} {{ familySize[f] === 1 ? 'person' : 'people' }}</span>
          <span class="muted sub block">Paid {{ inr(L.bal[f]?.paid ?? 0) }} · share {{ inr(L.bal[f]?.share ?? 0) }}</span>
          <span class="meter"><i :style="{ width: ((L.bal[f]?.paid ?? 0) / maxPaid) * 100 + '%', background: famColor(f) }" /></span>
        </span>
        <span class="v" :class="net(f) > 0 ? 'pos' : net(f) < 0 ? 'neg' : ''">{{ net(f) > 0 ? 'gets ' + inr(net(f)) : net(f) < 0 ? 'owes ' + inr(-net(f)) : 'even' }}</span>
      </div>
    </section>

    <template v-for="d in days" :key="d.label">
      <div class="day"><span>{{ d.label }}</span><span>{{ inr(d.total) }}</span></div>
      <div v-for="e in d.items" :key="e.id" class="ex" role="button" tabindex="0" :style="{ '--k': CATS[e.category].c }"
        @click="armed = armed === e.id ? null : e.id" @keydown.enter="armed = armed === e.id ? null : e.id">
        <span class="cat">{{ CATS[e.category].icon }}</span>
        <span class="mid">
          <b>{{ e.what }}</b>
          <span class="muted">{{ e.paid_by }} paid{{ e.split.length < families.length ? ' · split: ' + e.split.join(', ') : '' }}</span>
        </span>
        <q-btn v-if="armed === e.id" unelevated no-caps dense class="del" label="Remove" :loading="removing === e.id" @click.stop="remove(e)" />
        <span v-else class="amt display">{{ inr(e.amount) }}</span>
      </div>
    </template>
    <p v-if="!expenses.length" class="empty muted">No expenses yet. Tap <b>Add expense</b> after the first fuel stop or toll.</p>
    <p v-else class="empty muted">Tap an expense to remove it.</p>

    <button class="fab" @click="openForm"><q-icon name="add" size="20px" />Add expense</button>

    <div v-if="form.open" class="modal" @click.self="form.open = false">
      <form class="msheet" novalidate @submit.prevent="save">
        <div class="grab" />
        <h2>Add expense</h2>
        <label class="amt-in" for="ex-amt"><span class="display">₹</span>
          <input id="ex-amt" ref="amtEl" v-model="form.amount" inputmode="numeric" placeholder="0" autocomplete="off" @input="form.amount = form.amount.replace(/\D/g, '').slice(0, 6)" />
        </label>
        <label class="fl" for="ex-what">What For</label>
        <input id="ex-what" v-model="form.what" class="txt-in" maxlength="60" placeholder="e.g. Diesel at Kurnool" autocomplete="off" />
        <span class="fl">Category</span>
        <div class="chips">
          <button v-for="(c, k) in CATS" :key="k" type="button" :class="{ on: form.category === k }" @click="form.category = k">{{ c.icon }} {{ c.label }}</button>
        </div>
        <span class="fl">Paid By</span>
        <div class="chips">
          <button v-for="f in families" :key="f" type="button" :class="{ on: form.paid_by === f }" @click="form.paid_by = f">{{ f }}</button>
        </div>
        <span class="fl">Split Between</span>
        <div class="chips">
          <button v-for="f in families" :key="f" type="button" :class="{ on: form.split.includes(f) }" :aria-pressed="form.split.includes(f)" @click="toggleSplit(f)">
            {{ form.split.includes(f) ? '✓ ' : '' }}{{ f }}
          </button>
        </div>
        <p class="err">{{ form.err }}</p>
        <div class="m-acts">
          <button type="button" @click="form.open = false">Cancel</button>
          <q-btn type="submit" unelevated no-caps class="main" :loading="form.busy" :label="`Add ${inr(+form.amount || 0)}`" />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Notify } from 'quasar'
import { supabase, me } from '../supabase'
import { expenses, members, families, familySize, perPerson, setPerPerson, startTrip } from '../trip'
import { ledger } from '../ledger'
import { inr, dayLabel } from '../format'

const CATS = {
  fuel: { label: 'Fuel', icon: '⛽', c: '#E8890C' },
  toll: { label: 'Toll', icon: '🛣️', c: '#7A5442' },
  food: { label: 'Food', icon: '🍛', c: '#B5121B' },
  stay: { label: 'Stay', icon: '🏨', c: '#0F7C7A' },
  darshan: { label: 'Darshan', icon: '🛕', c: '#D4A017' },
  other: { label: 'Other', icon: '🧾', c: '#A88A6E' },
}
const PALETTE = ['#D9701E', '#B5121B', '#0F7C7A', '#6B4A8A', '#D4A017', '#2F7D4F']
const famColor = (f) => PALETTE[Math.max(families.value.indexOf(f), 0) % PALETTE.length]
const ab = (f) => f.replace(/[^\p{L}]/gu, '').slice(0, 2)

const L = computed(() => ledger(expenses.value, familySize.value, perPerson.value))
const net = (f) => Math.round(L.value.bal[f]?.net ?? 0)
const maxPaid = computed(() => Math.max(1, ...Object.values(L.value.bal).map((b) => b.paid)))
const byCat = computed(() => Object.keys(CATS).map((k) => [k, expenses.value.filter((e) => e.category === k).reduce((a, e) => a + e.amount, 0)]).filter(([, v]) => v > 0))
const days = computed(() => {
  const out = []
  for (const e of expenses.value) {
    const label = dayLabel(e.created_at)
    let d = out.at(-1)
    if (d?.label !== label) out.push((d = { label, items: [], total: 0 }))
    d.items.push(e)
    d.total += e.amount
  }
  return out
})

const armed = ref(null)
const removing = ref(null)
async function remove(e) {
  removing.value = e.id
  const { error } = await supabase.from('expenses').delete().eq('id', e.id)
  removing.value = null
  if (error) return Notify.create({ type: 'negative', message: 'Could not remove it. Check your internet.', position: 'top' })
  expenses.value = expenses.value.filter((x) => x.id !== e.id)
  armed.value = null
  Notify.create({ type: 'positive', message: `Removed ${e.what}`, position: 'top', timeout: 1500 })
}

const amtEl = ref(null)
const form = reactive({ open: false, busy: false, err: '', amount: '', what: '', category: 'food', paid_by: '', split: [] })
function openForm() {
  Object.assign(form, { open: true, busy: false, err: '', amount: '', what: '', category: 'food', paid_by: me.value.family, split: [...families.value] })
  nextTick(() => amtEl.value?.focus())
}
const toggleSplit = (f) => (form.split = form.split.includes(f) ? form.split.filter((x) => x !== f) : [...form.split, f])

async function save() {
  const amount = parseInt(form.amount || '0', 10), what = form.what.trim()
  form.err = !amount ? 'Enter the amount.'
    : amount > 500000 ? 'That looks too large. Check the amount.'
    : !what ? 'Say what it was for, e.g. "Tolls to Kurnool".'
    : !form.split.length ? 'Pick at least one family to split with.' : ''
  if (form.err) return
  form.busy = true
  const { data, error } = await supabase.from('expenses')
    .insert({ trip_id: me.value.trip.id, created_by: me.value.id, what, amount, category: form.category, paid_by: form.paid_by, split: form.split })
    .select().single()
  form.busy = false
  if (error) return (form.err = 'Could not save. Check your internet and try again.')
  if (!expenses.value.some((x) => x.id === data.id)) expenses.value = [data, ...expenses.value]
  form.open = false
  Notify.create({ type: 'positive', message: `Added ${inr(amount)} · ${what}`, position: 'top', timeout: 1500 })
}

onMounted(startTrip)
</script>

<style scoped>
.page { padding-bottom: calc(170px + env(safe-area-inset-bottom)); }
.ex-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.ex-head h1 { font-size: 34px; }
.split { display: flex; background: var(--sandal); border-radius: 12px; padding: 3px; }
.split button { border: 0; background: none; padding: 6px 10px; border-radius: 9px; font: inherit; font-size: 12px; font-weight: 700; color: var(--ink-2); cursor: pointer; }
.split button.on { background: var(--kumkum); color: #FFE7B0; }

.shrine {
  position: relative; overflow: hidden; border-radius: 28px; padding: 30px 16px 16px; color: #FFE7B0;
  background: var(--jaali), radial-gradient(120% 90% at 85% 0%, #8E1A24 0%, var(--kumkum) 62%);
  box-shadow: 0 24px 44px -22px rgba(90, 11, 22, .65);
}
.shrine::before { content: ""; position: absolute; inset: 0 0 auto; height: 14px; background: var(--scallop); }
.gopuram { position: absolute; right: -4px; bottom: 0; width: 112px; fill: var(--gold); opacity: .14; }
.shrine > *:not(.gopuram) { position: relative; }
.eyebrow.light { color: rgba(255, 231, 176, .72); }
.tot { font-size: 46px; color: var(--gold); margin-top: 4px; font-variant-numeric: tabular-nums; }
.tot-sub { font-size: 13px; margin-top: 4px; }
.catbar { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; margin-top: 14px; background: rgba(255, 214, 120, .15); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 10px; font-size: 12px; }
.legend span { display: flex; align-items: center; gap: 5px; }
.legend i { width: 8px; height: 8px; border-radius: 50%; }

.box { margin-top: 14px; background: var(--card); border: 1px solid var(--line); border-radius: 22px; padding: 14px; }
.box-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.box-h h3 { font-size: 22px; }
.box-h small { font-size: 12px; }
.fam { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; color: #fff; font-family: 'Rozha One', serif; font-size: 15px; flex: none; }
.tx { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px dashed var(--line); font-size: 14px; }
.tx:first-of-type { border-top: 0; }
.who { min-width: 0; display: grid; line-height: 1.3; }
.who > span { font-size: 12px; }
.arrow { color: var(--marigold); }
.tx .amt { margin-left: auto; font-size: 20px; color: var(--sindoor); }
.settled { margin: 4px 0; font-size: 14px; color: var(--ok); font-weight: 700; }
.balrow { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 0; }
.mid { min-width: 0; }
.nm { font-weight: 700; font-size: 14px; }
.sub { font-size: 12px; }
.block { display: block; }
.meter { display: block; height: 6px; border-radius: 3px; background: var(--sandal); margin-top: 5px; overflow: hidden; }
.meter i { display: block; height: 100%; border-radius: 3px; }
.v { font-weight: 700; font-size: 13px; text-align: right; }
.v.pos { color: var(--ok); }
.v.neg { color: var(--sindoor); }

.day { margin: 22px 2px 8px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); }
.ex { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; }
.ex:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.cat { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 19px; background: color-mix(in srgb, var(--k) 18%, white); flex: none; }
.ex .mid b { font-size: 14px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex .mid span { font-size: 12px; }
.ex .amt { font-size: 19px; white-space: nowrap; }
.del { background: var(--sindoor); color: #fff; border-radius: 10px; padding: 2px 10px; font-weight: 700; }
.empty { text-align: center; font-size: 13px; margin-top: 16px; }

.fab {
  position: fixed; z-index: 9; right: max(16px, calc(50% - 224px)); bottom: calc(96px + env(safe-area-inset-bottom));
  display: flex; gap: 6px; align-items: center; border: 0; border-radius: 18px; padding: 13px 18px; cursor: pointer;
  background: var(--sindoor); color: #fff; font: inherit; font-weight: 700; font-size: 15px; box-shadow: 0 14px 28px -10px rgba(181, 18, 27, .6);
}
.modal { position: fixed; inset: 0; z-index: 20; background: rgba(59, 10, 18, .45); display: flex; align-items: flex-end; justify-content: center; }
.msheet { width: 100%; max-width: 480px; background: var(--bg); border-radius: 28px 28px 0 0; padding: 10px 18px calc(20px + env(safe-area-inset-bottom)); max-height: 92dvh; overflow-y: auto; box-sizing: border-box; }
.grab { width: 40px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto 10px; }
.msheet h2 { font-size: 26px; margin: 4px 0 12px; }
.amt-in { display: flex; align-items: center; gap: 6px; background: var(--card); border: 2px solid var(--line); border-radius: 18px; padding: 4px 14px; }
.amt-in span { font-size: 30px; color: var(--ink-2); }
.amt-in input { border: 0; outline: 0; background: none; font-family: 'Rozha One', serif; font-size: 34px; width: 100%; min-width: 0; color: var(--ink); }
.amt-in:focus-within { border-color: var(--marigold); }
.fl { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); margin: 14px 0 6px; }
.txt-in { width: 100%; box-sizing: border-box; border: 2px solid var(--line); border-radius: 14px; padding: 10px 12px; font: inherit; font-size: 16px; background: var(--card); color: var(--ink); outline: 0; }
.txt-in:focus { border-color: var(--marigold); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { border: 2px solid var(--line); background: var(--card); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; font-weight: 700; color: var(--ink); cursor: pointer; }
.chips button.on { border-color: var(--kumkum); background: var(--kumkum); color: #FFE7B0; }
.err { color: var(--sindoor); font-size: 13px; min-height: 18px; margin: 10px 0 0; }
.m-acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 10px; }
.m-acts > button { border: 0; border-radius: 14px; padding: 13px; font: inherit; font-weight: 700; font-size: 15px; background: var(--sandal); color: var(--ink); cursor: pointer; }
.m-acts .main { background: var(--sindoor); color: #fff; border-radius: 14px; font-weight: 700; font-size: 15px; }
</style>
