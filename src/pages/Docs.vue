<template>
  <div class="page">
    <header class="pg-head"><h1>Docs</h1><small>only the {{ members.length }} yatris can open these</small></header>

    <section class="shrine ticket">
      <svg class="gopuram" viewBox="0 0 100 140" aria-hidden="true"><path d="M48 6h4v8h-4z M44 14h12l-2 6H46z M40 20h20l3 14H37z M33 34h34l5 18H28z M25 52h50l6 20H19z M16 72h68l7 22H9z M6 94h88v46H6z" /></svg>
      <template v-if="ticket">
        <div class="eyebrow light">Darshan ticket · TTD</div>
        <h2 class="t-title">{{ ticket.title }}</h2>
        <div class="t-when">{{ ticket.note || 'Tap to open the ticket' }}</div>
        <div class="t-foot"><span>Report <b>1 hour early</b> with each yatri's Aadhaar</span><button class="t-open" @click="view(ticket)">Open ticket</button></div>
      </template>
      <template v-else>
        <div class="eyebrow light">Darshan ticket · TTD</div>
        <h2 class="t-title">Add your darshan ticket</h2>
        <div class="t-when">Save the PDF or a screenshot here so it opens without signal at the counter.</div>
        <div class="t-foot"><span /><button class="t-open" @click="add({ kind: 'ticket', title: 'Special entry darshan', askNote: 'Day and slot, e.g. Tue 10 Nov · 10:00 am' })">+ Add ticket</button></div>
      </template>
    </section>

    <section class="box">
      <div class="idrow">
        <svg class="ring" viewBox="0 0 58 58" aria-hidden="true"><circle class="bg" cx="29" cy="29" r="24" /><circle class="fg" cx="29" cy="29" r="24" stroke-dasharray="150.8" :stroke-dashoffset="150.8 * (1 - idDone / Math.max(members.length, 1))" /><text x="29" y="30">{{ idDone }}/{{ members.length }}</text></svg>
        <div><h3>ID for darshan</h3><p v-if="idDone === members.length" class="all">Everyone's Aadhaar is in 🙏</p><p v-else class="muted">Missing: {{ members.filter((p) => !aadhaar[p.id]).map((p) => p.name).join(', ') }}</p></div>
      </div>
      <div class="people">
        <button v-for="p in members" :key="p.id" :class="{ ok: aadhaar[p.id] }" @click="aadhaar[p.id] ? view(aadhaar[p.id]) : add({ kind: 'aadhaar', member_id: p.id, title: `Aadhaar · ${p.name}` })">
          <i>{{ aadhaar[p.id] ? '✓' : '+' }}</i>{{ p.id === me.id ? 'You' : p.name }}
        </button>
      </div>
    </section>

    <section class="box">
      <div class="box-h"><h3>Car papers</h3><small>checked against the trip dates</small></div>
      <template v-for="c in myCarFirst" :key="c.id">
        <div class="carhd" :style="{ '--c': c.color }"><i class="dot-c" />{{ c.name }}</div>
        <div class="docs">
          <button v-for="s in SLOTS" :key="s.title" class="doc" @click="paper(c, s) ? view(paper(c, s)) : add({ kind: 'car', car_id: c.id, title: s.title, askExpiry: s.expiry, askNote: s.note })">
            <span class="ic">{{ s.ic }}</span>
            <span class="mid"><b>{{ s.title }}</b><span>{{ paperSub(c, s) }}</span></span>
            <span class="st" :class="paperStatus(c, s)[0]">{{ paperStatus(c, s)[1] }}</span>
          </button>
        </div>
      </template>
    </section>

    <section class="box">
      <div class="box-h"><h3>Bookings</h3><small>stays and other tickets</small></div>
      <div class="docs">
        <button v-for="d in bookings" :key="d.id" class="doc" @click="view(d)">
          <span class="ic">🏨</span><span class="mid"><b>{{ d.title }}</b><span>{{ d.note || 'Saved' }}</span></span><span class="st ok">Saved</span>
        </button>
      </div>
      <button class="add-doc" @click="add({ kind: 'booking', title: '', askTitle: true, askNote: 'e.g. Mon 9 Nov · 3 rooms' })">+ Add a photo or PDF</button>
    </section>

    <section class="box">
      <div class="box-h"><h3>Packing list</h3><small>{{ packed }} of {{ pack.length }} packed</small></div>
      <div class="pack-bar"><i :style="{ transform: `scaleX(${packed / Math.max(pack.length, 1)})` }" /></div>
      <div class="pack">
        <button v-for="x in pack" :key="x.id" :class="{ on: x.packed_by }" @click="togglePack(x)">
          <span class="bx">{{ x.packed_by ? '✓' : '' }}</span>
          <span class="tx2">{{ x.title }}<small v-if="x.note">{{ x.note }}</small></span>
          <span v-if="x.packed_by" class="by">{{ x.packed_by }}</span>
        </button>
      </div>
      <form class="pack-add" @submit.prevent="addPack">
        <input v-model="newItem" class="txt-in" maxlength="60" placeholder="Add an item, e.g. Umbrella" />
        <q-btn type="submit" unelevated no-caps class="dark" label="Add" :loading="packBusy" />
      </form>
    </section>

    <!-- Add a document -->
    <div v-if="form" class="sheet-bg" @click.self="form = null">
      <form class="sheet-in" novalidate @submit.prevent="upload">
        <div class="grab" /><button type="button" class="pclose" aria-label="Close" @click="form = null">✕</button>
        <h2>{{ form.title || 'Add a booking' }}</h2>
        <template v-if="form.askTitle">
          <label class="fl" for="d-title">Title</label>
          <input id="d-title" v-model="form.title" class="txt-in" maxlength="60" placeholder="e.g. Hotel, Kurnool" />
        </template>
        <template v-if="form.askNote">
          <label class="fl" for="d-note">Details</label>
          <input id="d-note" v-model="form.note" class="txt-in" maxlength="80" :placeholder="form.askNote" />
        </template>
        <template v-if="form.askExpiry">
          <label class="fl" for="d-exp">Valid Till</label>
          <input id="d-exp" v-model="form.expires_on" class="txt-in" type="date" />
        </template>
        <span class="fl">Photo Or PDF</span>
        <label class="pick">
          <input type="file" accept="image/*,application/pdf" @change="form.file = $event.target.files[0]" />
          <q-icon name="photo_camera" size="22px" />{{ form.file ? form.file.name : 'Take a photo or choose a file' }}
        </label>
        <p class="err">{{ form.err }}</p>
        <div class="btn2"><button type="button" @click="form = null">Cancel</button><q-btn type="submit" unelevated no-caps class="dark" label="Save" :loading="form.busy" /></div>
      </form>
    </div>

    <!-- View a document -->
    <div v-if="shown" class="sheet-bg" @click.self="shown = null">
      <div class="sheet-in">
        <div class="grab" /><button class="pclose" aria-label="Close" @click="shown = null">✕</button>
        <div class="eyebrow">Added {{ dayLabel(shown.doc.created_at) }}</div>
        <h2>{{ shown.doc.title }}</h2>
        <p v-if="shown.doc.note || shown.doc.expires_on" class="muted sub">{{ [shown.doc.note, shown.doc.expires_on && `Valid till ${fmtDate(shown.doc.expires_on)}`].filter(Boolean).join(' · ') }}</p>
        <div class="docview">
          <q-spinner v-if="!shown.url" size="32px" color="primary" />
          <img v-else-if="!shown.doc.path.endsWith('.pdf')" :src="shown.url" :alt="shown.doc.title" />
          <a v-else :href="shown.url" target="_blank" rel="noopener" class="pdf">📄 Open the PDF</a>
        </div>
        <div class="btn2"><q-btn unelevated no-caps label="Remove" :loading="shown.busy" @click="remove(shown)" /><a v-if="shown.url" class="dark full" :href="shown.url" target="_blank" rel="noopener">Full screen</a></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import { supabase, me } from '../supabase'
import { members, myCarFirst, docs, pack, startTrip } from '../trip'
import { dayLabel } from '../format'

const SLOTS = [
  { ic: '📘', title: 'RC', note: 'Number plate, e.g. MH 12 AB 1234' },
  { ic: '🛡️', title: 'Insurance', expiry: true },
  { ic: '🌫️', title: 'PUC', expiry: true },
  { ic: '🪪', title: 'Driving licence', expiry: true, note: 'Whose licence?' },
  { ic: '🏷️', title: 'FASTag', note: 'Tag ID or bank' },
]
// ponytail: trip end isn't stored; assume a week after departure. Add trips.ends_at when the plan is final.
const tripEnd = computed(() => new Date(new Date(me.value.trip.starts_at).getTime() + 7 * 864e5))
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const ticket = computed(() => docs.value.filter((d) => d.kind === 'ticket').at(-1))
const aadhaar = computed(() => Object.fromEntries(docs.value.filter((d) => d.kind === 'aadhaar').map((d) => [d.member_id, d])))
const idDone = computed(() => members.value.filter((p) => aadhaar.value[p.id]).length)
const bookings = computed(() => docs.value.filter((d) => d.kind === 'booking'))
const paper = (c, s) => docs.value.filter((d) => d.kind === 'car' && d.car_id === c.id && d.title === s.title).at(-1)
const paperSub = (c, s) => {
  const d = paper(c, s)
  if (!d) return 'Not added yet'
  return [d.note, d.expires_on && `Valid till ${fmtDate(d.expires_on)}`].filter(Boolean).join(' · ') || 'Added'
}
function paperStatus(c, s) {
  const d = paper(c, s)
  if (!d) return ['bad', 'Add']
  if (!d.expires_on) return ['ok', 'Added']
  const exp = new Date(d.expires_on)
  if (exp < tripEnd.value) return ['bad', 'Renew']
  return exp - tripEnd.value < 30 * 864e5 ? ['warn', 'Soon'] : ['ok', 'Valid']
}

const form = ref(null)
const add = (o) => (form.value = { note: '', expires_on: '', file: null, err: '', busy: false, ...o })
async function upload() {
  const f = form.value
  f.title = f.title.trim()
  f.err = !f.title ? 'Give it a title.' : !f.file ? 'Pick a photo or PDF.' : f.file.size > 10 * 1024 * 1024 ? 'That file is over 10 MB. Try a photo instead.' : ''
  if (f.err) return
  f.busy = true
  const ext = f.file.type === 'application/pdf' ? 'pdf' : (f.file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${me.value.trip.id}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('docs').upload(path, f.file, { contentType: f.file.type })
  const { data, error } = up.error ? up : await supabase.from('docs').insert({
    trip_id: me.value.trip.id, kind: f.kind, member_id: f.member_id ?? null, car_id: f.car_id ?? null,
    title: f.title, note: f.note.trim(), expires_on: f.expires_on || null, path, created_by: me.value.id,
  }).select().single()
  f.busy = false
  if (error) return (f.err = 'Could not save. Check your internet and try again.')
  if (!docs.value.some((d) => d.id === data.id)) docs.value = [...docs.value, data]
  form.value = null
  Notify.create({ type: 'positive', message: `Saved ${data.title}`, position: 'top', timeout: 1500 })
}

const shown = ref(null)
async function view(doc) {
  shown.value = { doc, url: null, busy: false }
  const { data, error } = await supabase.storage.from('docs').createSignedUrl(doc.path, 3600)
  if (error) { shown.value = null; return Notify.create({ type: 'negative', message: 'Could not open it. Check your internet.', position: 'top' }) }
  if (shown.value?.doc.id === doc.id) shown.value.url = data.signedUrl
}
async function remove(s) {
  s.busy = true
  const { error } = await supabase.from('docs').delete().eq('id', s.doc.id)
  if (!error) await supabase.storage.from('docs').remove([s.doc.path])
  s.busy = false
  if (error) return Notify.create({ type: 'negative', message: 'Could not remove it. Check your internet.', position: 'top' })
  docs.value = docs.value.filter((d) => d.id !== s.doc.id)
  shown.value = null
}

const packed = computed(() => pack.value.filter((x) => x.packed_by).length)
async function togglePack(x) {
  const packed_by = x.packed_by ? null : me.value.name, prev = x.packed_by
  pack.value = pack.value.map((y) => (y.id === x.id ? { ...y, packed_by } : y)) // optimistic; realtime confirms
  const { error } = await supabase.from('pack_items').update({ packed_by }).eq('id', x.id)
  if (error) {
    pack.value = pack.value.map((y) => (y.id === x.id ? { ...y, packed_by: prev } : y))
    Notify.create({ type: 'negative', message: 'Could not update. Check your internet.', position: 'top' })
  }
}
const newItem = ref('')
const packBusy = ref(false)
async function addPack() {
  const title = newItem.value.trim()
  if (!title) return
  packBusy.value = true
  const { data, error } = await supabase.from('pack_items').insert({ trip_id: me.value.trip.id, title }).select().single()
  packBusy.value = false
  if (error) return Notify.create({ type: 'negative', message: 'Could not add it. Check your internet.', position: 'top' })
  if (!pack.value.some((y) => y.id === data.id)) pack.value = [...pack.value, data]
  newItem.value = ''
}

onMounted(startTrip)
</script>

<style scoped>
a { color: inherit; text-decoration: none; }
.ticket { padding-bottom: 14px; }
.t-title { font-size: 28px; color: #fff; margin: 4px 90px 0 0; }
.t-when { margin-top: 6px; font-size: 13px; padding-right: 60px; }
.t-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 2px dashed rgba(245, 194, 74, .35); font-size: 12.5px; }
.t-foot b { color: var(--gold); }
.t-open { border: 0; border-radius: 12px; padding: 8px 14px; background: var(--gold); color: var(--kumkum); font: inherit; font-weight: 800; font-size: 13px; cursor: pointer; white-space: nowrap; }

.idrow { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.idrow h3 { font-size: 21px; }
.idrow p { margin: 2px 0 0; font-size: 13px; }
.all { color: var(--ok); font-weight: 700; }
.ring { width: 58px; height: 58px; flex: none; }
.ring circle { fill: none; stroke-width: 6; }
.ring .bg { stroke: var(--sandal); }
.ring .fg { stroke: var(--ok); stroke-linecap: round; transition: stroke-dashoffset .35s; transform: rotate(-90deg); transform-origin: 50% 50%; }
.ring text { font-family: 'Rozha One', serif; font-size: 16px; fill: var(--ink); text-anchor: middle; dominant-baseline: central; }
.people { display: flex; flex-wrap: wrap; gap: 6px; }
.people button { border: 2px dashed var(--line); background: var(--card); border-radius: 999px; padding: 4px 10px 4px 4px; font: inherit; font-size: 12px; font-weight: 700; color: var(--ink-2); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.people button i { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-size: 11px; background: var(--sandal); }
.people button.ok { border-style: solid; color: var(--ink); }
.people button.ok i { background: var(--ok); color: #fff; }

.carhd { display: flex; align-items: center; gap: 8px; margin: 12px 0 8px; font-weight: 800; font-size: 13px; }
.carhd:first-of-type { margin-top: 0; }
.docs { display: grid; gap: 8px; }
.doc { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; border: 1px solid var(--line); border-radius: 16px; padding: 10px 12px; background: var(--bg); font: inherit; color: var(--ink); cursor: pointer; }
.doc .ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-size: 19px; background: var(--sandal); flex: none; }
.doc .mid { flex: 1; min-width: 0; display: grid; }
.doc .mid b { font-size: 14px; }
.doc .mid span { font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st { font-size: 11px; font-weight: 800; border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
.st.ok { background: #DDF2E4; color: var(--ok); }
.st.warn { background: #FFE6C2; color: #9A4B00; }
.st.bad { background: #FBE0DE; color: var(--sindoor); }
.add-doc { width: 100%; border: 2px dashed var(--line); border-radius: 16px; padding: 12px; background: none; font: inherit; font-weight: 700; color: var(--ink-2); font-size: 14px; margin-top: 8px; cursor: pointer; }

.pack-bar { height: 8px; border-radius: 4px; background: var(--sandal); overflow: hidden; margin: 2px 0 10px; }
.pack-bar i { display: block; height: 100%; background: var(--ok); transform-origin: left; transition: transform .3s; }
.pack { display: grid; }
.pack button { display: flex; align-items: center; gap: 10px; text-align: left; border: 0; background: none; padding: 8px 2px; border-top: 1px dashed var(--line); font: inherit; font-size: 14px; color: var(--ink); cursor: pointer; }
.pack button:first-child { border-top: 0; }
.bx { width: 24px; height: 24px; border-radius: 8px; border: 2px solid var(--line); display: grid; place-items: center; flex: none; font-size: 13px; color: #fff; }
.pack button.on .bx { background: var(--ok); border-color: var(--ok); }
.pack button.on .tx2 { text-decoration: line-through; color: var(--ink-2); }
.tx2 small { display: block; font-size: 11.5px; color: var(--ink-2); }
.by { margin-left: auto; font-size: 11px; color: var(--ink-2); white-space: nowrap; }
.pack-add { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 10px; }
.pack-add .q-btn { border-radius: 14px; font-weight: 700; padding: 0 16px; }
.dark { background: var(--kumkum) !important; color: #FFE7B0 !important; }

.pick { display: flex; align-items: center; gap: 10px; border: 2px dashed var(--line); border-radius: 14px; padding: 14px; font-weight: 700; color: var(--ink-2); cursor: pointer; overflow: hidden; }
.pick input { display: none; }
.err { color: var(--sindoor); font-size: 13px; min-height: 18px; margin: 10px 0 0; }
.sub { font-size: 13px; margin: 0 0 10px; }
.docview { min-height: 200px; border-radius: 18px; border: 2px dashed var(--line); background: var(--card); display: grid; place-items: center; overflow: hidden; }
.docview img { width: 100%; display: block; }
.pdf { font-weight: 800; font-size: 16px; padding: 30px; }
.full { display: grid; place-items: center; border-radius: 14px; font-weight: 700; }
</style>
