<template>
  <div class="join">
    <div class="sky">
      <div class="orb orb-a" />
      <div class="orb orb-b" />
      <div class="brand">
        <div class="eyebrow light">Family Yatra · 2026</div>
        <h1>Pune<br /><span class="to">to</span> Tirupati</h1>
        <div class="route">
          <span>{{ trip ? `${trip.members.length} joined` : 'Family road trip' }}</span><i />
          <span>{{ trip ? `${trip.cars.length} cars` : '2 cars' }}</span><i /><span>1 yatra</span>
        </div>
      </div>
    </div>

    <div class="sheet">
      <!-- 1. Trip code -->
      <template v-if="step === 'code'">
        <h2>Enter trip code</h2>
        <p class="muted">You'll find it in the family WhatsApp group.</p>
        <PinBoxes v-model="code" autofocus @complete="findTrip" />
        <q-btn class="go full-width q-mt-lg" unelevated no-caps :loading="busy" :disable="code.length !== 4"
          label="Continue" @click="findTrip" />
      </template>

      <!-- 2. New or returning -->
      <template v-else-if="step === 'choose'">
        <h2>Welcome aboard</h2>
        <p class="muted">Is this your first time opening the app?</p>
        <button class="choice" @click="step = 'new'">
          <span class="choice-icon new"><q-icon name="person_add" size="24px" /></span>
          <span><b>I'm new</b><span class="muted">Add yourself to the trip</span></span>
          <q-icon name="chevron_right" size="24px" class="muted" />
        </button>
        <button class="choice" @click="step = 'login'">
          <span class="choice-icon back"><q-icon name="phonelink_lock" size="24px" /></span>
          <span><b>I've joined before</b><span class="muted">New phone or reinstalled app</span></span>
          <q-icon name="chevron_right" size="24px" class="muted" />
        </button>
        <q-btn flat no-caps class="muted q-mt-sm" icon="arrow_back" label="Different code" @click="reset" />
      </template>

      <!-- 3a. Register -->
      <template v-else-if="step === 'new'">
        <div class="row items-center no-wrap">
          <h2>About you</h2>
          <q-space />
          <q-btn v-if="trip.members.length" flat dense no-caps class="muted" icon="arrow_back" label="Back" @click="step = 'choose'" />
        </div>
        <p class="muted">Everyone in the trip will see this.</p>

        <div class="field">
          <div class="eyebrow">Your name</div>
          <input v-model="form.name" class="text" maxlength="30" placeholder="e.g. Abhishek" autocomplete="given-name" />
        </div>

        <div class="field">
          <div class="eyebrow">Family</div>
          <div class="chips">
            <button v-for="f in families" :key="f" class="chip" :class="{ on: form.family === f && !newFamily }"
              @click="form.family = f; newFamily = false">{{ f }}</button>
            <button v-if="families.length" class="chip add" :class="{ on: newFamily }" @click="newFamily = true; form.family = ''">
              + New family
            </button>
          </div>
          <input v-if="newFamily" v-model="form.family" class="text" maxlength="30" placeholder="e.g. Sutar Family" />
        </div>

        <div class="field">
          <div class="eyebrow">Your car</div>
          <div class="cars">
            <button v-for="c in trip.cars" :key="c.id" class="car" :class="{ on: form.car === c.id }"
              :style="{ '--car': c.color }" @click="form.car = c.id">
              <span class="car-icon"><q-icon name="directions_car" size="20px" /></span>
              <b>{{ c.name }}</b>
              <span class="muted small">{{ c.count }} joined</span>
            </button>
          </div>
        </div>

        <div class="field">
          <div class="eyebrow">Set a 4-digit PIN</div>
          <p class="muted small hint">You'll need it only to log in on another phone. Don't use your bank PIN.</p>
          <PinBoxes v-model="form.pin" secret />
        </div>

        <q-btn class="go full-width" unelevated no-caps :loading="busy" :disable="!canRegister"
          label="Join the trip" @click="register" />
      </template>

      <!-- 3b. Log in: pick name -->
      <template v-else-if="step === 'login' && !picked">
        <div class="row items-center no-wrap">
          <h2>Who's this?</h2>
          <q-space />
          <q-btn flat dense no-caps class="muted" icon="arrow_back" label="Back" @click="step = 'choose'" />
        </div>
        <p class="muted">Tap your name, then enter your PIN.</p>
        <div v-for="(people, family) in byFamily" :key="family" class="family">
          <div class="eyebrow q-mb-sm">{{ family }}</div>
          <div class="people">
            <button v-for="p in people" :key="p.id" class="person" @click="picked = p; pin = ''">
              <span class="avatar" :style="{ background: colorFor(p.name) }">{{ p.name[0] }}</span>
              <span class="name">{{ p.name }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- 3c. Log in: PIN -->
      <template v-else-if="step === 'login'">
        <div class="row items-center no-wrap">
          <span class="avatar q-mr-sm" :style="{ background: colorFor(picked.name) }">{{ picked.name[0] }}</span>
          <h2>Hi {{ picked.name }}</h2>
          <q-space />
          <q-btn flat dense no-caps class="muted" icon="arrow_back" label="Back" @click="picked = null" />
        </div>
        <p class="muted">Enter the PIN you set when you joined.</p>
        <PinBoxes :key="picked.id + attempts" v-model="pin" secret autofocus @complete="login" />
        <q-btn class="go full-width q-mt-lg" unelevated no-caps :loading="busy" :disable="pin.length !== 4"
          label="Log in" @click="login" />
        <p class="muted small q-mt-md text-center">Forgot your PIN? Ask Abhishek to reset it.</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { supabase, loadMe } from '../supabase'
import PinBoxes from '../components/PinBoxes.vue'

const router = useRouter()
const step = ref('code')
const code = ref('')
const trip = ref(null)
const busy = ref(false)
const form = reactive({ name: '', family: '', car: null, pin: '' })
const newFamily = ref(false)
const picked = ref(null)
const pin = ref('')
const attempts = ref(0)

const families = computed(() => [...new Set(trip.value.members.map((m) => m.family))].sort())
// ponytail: not Object.groupBy, older Android WebViews lack it
const byFamily = computed(() => trip.value.members.reduce((g, p) => ((g[p.family] ??= []).push(p), g), {}))
const canRegister = computed(() => form.name.trim() && form.family.trim() && form.car && form.pin.length === 4)

const palette = ['#FF6B1A', '#F43F72', '#6D4AFF', '#0EA5A4', '#E8A100', '#3B82F6', '#22A06B']
const colorFor = (name) => palette[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % palette.length]

const fail = (message) => Notify.create({ type: 'negative', message, position: 'top' })

function reset() {
  step.value = 'code'
  code.value = ''
  trip.value = null
}

async function findTrip() {
  if (busy.value) return
  busy.value = true
  const { data, error } = await supabase.rpc('trip_info', { p_code: code.value })
  busy.value = false
  if (error) return fail('Could not reach the server. Check your internet.')
  if (!data) {
    code.value = ''
    return fail('No trip with that code.')
  }
  trip.value = data
  newFamily.value = !data.members.length
  step.value = data.members.length ? 'choose' : 'new'
}

// Every phone gets an anonymous Supabase user; the PIN is what ties it to a person.
async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const { error } = await supabase.auth.getUser() // stored session may belong to a deleted user
    if (!error) return
    await supabase.auth.signOut({ scope: 'local' })
  }
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

async function enter() {
  await loadMe()
  router.replace('/')
}

async function register() {
  busy.value = true
  try {
    await ensureSession()
    const { error } = await supabase.rpc('register', {
      p_code: code.value, p_name: form.name, p_family: form.family, p_car: form.car, p_pin: form.pin,
    })
    if (error) throw error
    await enter()
  } catch (e) {
    fail(e.message)
  } finally {
    busy.value = false
  }
}

const LOGIN_ERRORS = {
  wrong_pin: 'Wrong PIN. After 5 wrong tries the name locks for 15 minutes.',
  locked: 'Too many wrong PINs. Try again in 15 minutes.',
  not_found: 'That person is no longer in the trip.',
}

async function login() {
  if (busy.value) return
  busy.value = true
  try {
    await ensureSession()
    const { data, error } = await supabase.rpc('login', { p_code: code.value, p_member: picked.value.id, p_pin: pin.value })
    if (error) throw error
    if (data === 'ok') return await enter()
    fail(LOGIN_ERRORS[data])
    pin.value = ''
    attempts.value++ // remount the boxes so focus returns to the first one
  } catch (e) {
    fail(e.message)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.join {
  min-height: 100dvh;
  background: var(--jaali), radial-gradient(120% 70% at 90% 0%, #8E1A24 0%, var(--kumkum) 65%);
  display: flex;
  flex-direction: column;
}
.sky {
  flex: 1;
  min-height: 260px;
  display: flex;
  align-items: flex-end;
  position: relative;
  overflow: hidden;
  padding: max(48px, env(safe-area-inset-top)) 24px 64px;
  color: white;
}
.orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .7; }
.orb-a { width: 260px; height: 260px; background: var(--marigold); top: -80px; right: -90px; }
.orb-b { width: 220px; height: 220px; background: var(--sindoor); bottom: -120px; left: -60px; }
.brand { position: relative; width: 100%; max-width: 480px; margin: 0 auto; }
.eyebrow.light { color: rgba(255, 255, 255, .6); margin-bottom: 14px; }
h1 { font-size: clamp(52px, 16vw, 72px); font-weight: 800; }
.to {
  font-size: .5em;
  font-weight: 600;
  background: var(--glow);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.route { display: flex; align-items: center; gap: 10px; margin-top: 20px; font-size: 13px; color: rgba(255, 255, 255, .75); }
.route i { width: 4px; height: 4px; border-radius: 50%; background: var(--gold); }

.sheet {
  background: var(--bg);
  border-radius: 32px 32px 0 0;
  margin-top: -32px;
  padding: 28px 20px calc(28px + env(safe-area-inset-bottom));
  position: relative;
}
.sheet::before {
  content: "";
  position: absolute;
  left: 32px;
  right: 32px;
  top: -14px;
  height: 14px;
  background: var(--scallop);
  transform: scaleY(-1);
}
.sheet > * { max-width: 440px; margin-left: auto; margin-right: auto; }
.sheet h2 { font-size: 28px; font-weight: 800; }
.sheet > p { margin: 8px auto 22px; }
.small { font-size: 13px; }

.go {
  height: 56px;
  border-radius: 18px;
  background: var(--ink);
  color: white;
  font-weight: 700;
  font-size: 16px;
}

.choice {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-bottom: 12px;
  border: 0;
  border-radius: 20px;
  background: var(--card);
  box-shadow: var(--shadow);
  font: inherit;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}
.choice:active { transform: scale(.98); }
.choice > span:nth-child(2) { flex: 1; display: flex; flex-direction: column; font-size: 14px; }
.choice b { font-size: 17px; }
.choice-icon { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; color: white; }
.choice-icon.new { background: var(--marigold); }
.choice-icon.back { background: var(--peacock); }

.field { margin-bottom: 22px; }
.field .eyebrow { margin-bottom: 8px; }
.hint { margin: -4px 0 10px; }
.text {
  width: 100%;
  box-sizing: border-box;
  height: 52px;
  padding: 0 16px;
  border: 2px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  font: inherit;
  font-size: 17px;
  color: var(--ink);
  outline: none;
}
.text:focus { border-color: var(--marigold); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chips + .text { margin-top: 10px; }
.chip {
  padding: 10px 14px;
  border: 2px solid var(--line);
  border-radius: 999px;
  background: var(--card);
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
}
.chip.on { border-color: var(--ink); background: var(--ink); color: white; }
.chip.add { border-style: dashed; }
.chip.add.on { border-style: solid; }

.cars { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.car {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 14px;
  border: 2px solid var(--line);
  border-radius: 18px;
  background: var(--card);
  font: inherit;
  color: var(--ink);
  cursor: pointer;
}
.car b { font-size: 17px; margin-top: 8px; }
.car.on { border-color: var(--car); box-shadow: 0 0 0 4px color-mix(in srgb, var(--car) 18%, transparent); }
.car-icon { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; color: white; background: var(--car); }

.family { margin-bottom: 20px; }
.people { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.person {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 0;
  border-radius: 18px;
  background: var(--card);
  box-shadow: var(--shadow);
  font: inherit;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: transform .12s;
}
.person:active { transform: scale(.97); }
.person .name { font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
