<template>
  <div class="page">
    <header class="pg-head"><h1>Games</h1><small>both cars play live</small></header>

    <section class="shrine">
      <svg class="gopuram" viewBox="0 0 100 140" aria-hidden="true"><path d="M48 6h4v8h-4z M44 14h12l-2 6H46z M40 20h20l3 14H37z M33 34h34l5 18H28z M25 52h50l6 20H19z M16 72h68l7 22H9z M6 94h88v46H6z" /></svg>
      <div class="eyebrow light center">Yatra cup · all games</div>
      <div class="score">
        <template v-for="(c, i) in myCarFirst" :key="c.id">
          <div v-if="i" class="vs display">vs</div>
          <div class="t" :style="{ '--c': c.color }"><b class="display">{{ score[c.id] || 0 }}</b><span><i class="dot-c" />{{ c.name }}{{ c.id === me.car.id ? ' (you)' : '' }}</span></div>
        </template>
      </div>
      <div class="score-sub">{{ leadText }}</div>
    </section>

    <div class="sec"><h3>Pick a game</h3><small>no internet needed</small></div>
    <div class="games">
      <button v-for="(g, k) in GAMES" :key="k" class="game" :style="{ '--g': g.g }" @click="open(k)">
        <span class="who">{{ g.who }}</span><span class="em">{{ g.em }}</span><b class="display">{{ g.name }}</b><small>{{ g.sub }}</small>
      </button>
    </div>

    <div class="sec"><h3>Just now</h3><small>points as they happen</small></div>
    <div class="feed">
      <div v-for="p in points.slice(0, 6)" :key="p.id" :style="{ '--c': carOf(p.car_id)?.color }">
        <i class="dot-c" /><b>{{ carOf(p.car_id)?.name }}</b> {{ p.what }} +{{ p.points }}<span>{{ ago(p.created_at, now) }}</span>
      </div>
      <p v-if="!points.length" class="note center">No points yet. Start with Antakshari!</p>
    </div>

    <div v-if="game" class="sheet-bg" @click.self="close">
      <div class="sheet-in">
        <div class="grab" /><button class="pclose" aria-label="Close" @click="close">✕</button>

        <template v-if="game === 'antakshari'">
          <div class="eyebrow">Antakshari · {{ carOf(A.turn)?.name }}'s turn</div>
          <h2>Sing from…</h2>
          <div class="g-turn"><span :style="{ background: carOf(A.turn)?.color }">🎤 {{ carOf(A.turn)?.name }}</span></div>
          <div class="g-big"><div class="eyebrow light">Starting letter</div><div class="letter display">{{ A.l[0] }}<small>"{{ A.l[1] }}"</small></div></div>
          <div class="timer" :class="{ low: left <= 5 }"><i :style="{ transform: `scaleX(${left / total})` }" /></div><div class="note center">{{ left }}s</div>
          <div class="btn2"><button @click="antNext(false)">Couldn't 🙈</button><q-btn unelevated no-caps class="go" label="Sang it ✓" :loading="busy" @click="antNext(true)" /></div>
          <p class="note">Next letter comes from the last sound of the song.</p>
        </template>

        <template v-else-if="game === 'bingo'">
          <div class="eyebrow">Road bingo · {{ me.car.name }}'s card</div>
          <h2>Spot it, tap it</h2>
          <div class="bingo">
            <button v-for="([e, t], i) in B.card" :key="t" :class="{ win: winLine.includes(i), on: B.on.includes(i) }" @click="bingoTap(i)"><span>{{ e }}</span>{{ t }}</button>
          </div>
          <div class="btn2"><button @click="newCard">New card</button><button class="go" @click="close">Done</button></div>
          <p class="note">{{ winLine.length ? `Line complete! +3 for ${me.car.name}` : `${B.on.length} of 16 spotted · finish a row, column or diagonal` }}</p>
        </template>

        <template v-else-if="game === 'quiz'">
          <div class="eyebrow">Yatra quiz · {{ Q.i + 1 }} of {{ QUIZ.length }}</div>
          <div class="g-car"><button v-for="c in cars" :key="c.id" :class="{ on: Q.who === c.id }" :style="{ '--c': c.color }" @click="Q.who = c.id"><i class="dot-c" />{{ c.name }}</button></div>
          <div class="quiz-q display">{{ quiz[0] }}</div>
          <div class="quiz-o">
            <button v-for="(o, i) in quiz[1]" :key="o" :class="Q.a === null ? '' : i === quiz[2] ? 'right' : i === Q.a ? 'wrong' : ''" @click="answer(i)">{{ o }}</button>
          </div>
          <p class="note">{{ Q.a === null ? 'Pick which car is answering, then tap an answer.' : (Q.a === quiz[2] ? '✓ Right! ' : '✗ ') + quiz[3] }}</p>
          <div v-if="Q.a !== null" class="btn2 one"><button class="go" @click="nextQ">Next question</button></div>
        </template>

        <template v-else-if="game === 'charades'">
          <div class="eyebrow">Dumb charades · one person acts</div>
          <div class="g-car"><button v-for="c in cars" :key="c.id" :class="{ on: C.who === c.id }" :style="{ '--c': c.color }" @click="C.who = c.id"><i class="dot-c" />{{ c.name }}</button></div>
          <div class="g-big"><div class="eyebrow light">Only the actor looks</div><div class="movie display">{{ C.film }}</div><div class="hint">{{ words }} · show with your fingers first</div></div>
          <div class="timer" :class="{ low: left <= 5 }"><i :style="{ transform: `scaleX(${left / total})` }" /></div><div class="note center">{{ left }}s</div>
          <div class="btn2"><button @click="nextFilm">Skip film</button><q-btn unelevated no-caps class="go" label="Guessed ✓" :loading="busy" @click="guessed" /></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Notify } from 'quasar'
import { me } from '../supabase'
import { cars, myCarFirst, points, score, addPoint, otherCar, now, startTrip } from '../trip'
import { GAMES, LETTERS, SIGHTS, QUIZ, FILMS, LINES, shuffle, pick } from '../games/data'
import { ago } from '../format'

const carOf = (id) => cars.value.find((c) => c.id === id)
const leadText = computed(() => {
  const [a, b] = myCarFirst.value, sa = score.value[a?.id] || 0, sb = score.value[b?.id] || 0
  return !b ? '' : sa === sb ? (sa ? 'Level! Next point takes the lead.' : 'Nobody has scored yet. Let the games begin!') : `${(sa > sb ? a : b).name} leads by ${Math.abs(sa - sb)}`
})

const game = ref(null)
const busy = ref(false)
const left = ref(0), total = ref(30)
let timer
function countdown(sec, onEnd) {
  clearInterval(timer); total.value = left.value = sec
  timer = setInterval(() => { if (--left.value <= 0) { clearInterval(timer); onEnd() } }, 1000)
}
const close = () => { clearInterval(timer); game.value = null }

async function score1(carId, g, what, n = 1) {
  busy.value = true
  const error = await addPoint(carId, g, what, n)
  busy.value = false
  if (error) Notify.create({ type: 'negative', message: 'Could not save the point. Check your internet.', position: 'top' })
  return !error
}
const toast = (message) => Notify.create({ message, position: 'top', timeout: 1500 })
function confetti() { Notify.create({ color: 'positive', message: '🎉 +points!', position: 'top', timeout: 1200 }) }

// Antakshari: turn passes between cars every song or timeout.
const A = reactive({ turn: null, l: pick(LETTERS) })
function antStart() {
  countdown(30, () => { A.turn = otherCar.value?.id ?? A.turn; toast(`Time up! ${carOf(A.turn)?.name}'s turn`); antStart() })
}
async function antNext(sang) {
  if (sang && !(await score1(A.turn, 'antakshari', `Antakshari · sang on "${A.l[1]}"`))) return
  A.turn = A.turn === me.value.car.id ? otherCar.value?.id ?? A.turn : me.value.car.id
  A.l = pick(LETTERS); antStart()
}

// Road bingo: one card per phone; a full line scores 3 for your car.
const B = reactive({ card: [], on: [], won: false })
const newCard = () => Object.assign(B, { card: shuffle(SIGHTS).slice(0, 16), on: [], won: false })
const winLine = computed(() => LINES.find((l) => l.every((i) => B.on.includes(i))) || [])
async function bingoTap(i) {
  if (B.won) return
  B.on = B.on.includes(i) ? B.on.filter((x) => x !== i) : [...B.on, i]
  if (winLine.value.length) { B.won = true; if (await score1(me.value.car.id, 'bingo', 'Road bingo · line complete', 3)) confetti() }
}

// Quiz
const Q = reactive({ order: [], i: 0, who: null, a: null })
const quiz = computed(() => QUIZ[Q.order[Q.i] ?? 0])
async function answer(i) {
  if (Q.a !== null) return
  Q.a = i
  if (i === quiz.value[2]) await score1(Q.who, 'quiz', `Yatra quiz · ${quiz.value[1][i]}`)
}
const nextQ = () => { Q.i = (Q.i + 1) % QUIZ.length; Q.a = null }

// Charades
const C = reactive({ film: pick(FILMS), who: null })
const words = computed(() => { const n = C.film.split(' ').length; return `${n} word${n > 1 ? 's' : ''}` })
const nextFilm = () => { C.film = pick(FILMS.filter((f) => f !== C.film)); countdown(60, () => toast('Time up! Skip to the next film')) }
async function guessed() {
  if (await score1(C.who, 'charades', `Dumb charades · ${C.film}`)) { confetti(); nextFilm() }
}

function open(k) {
  const mine = me.value.car.id
  if (k === 'antakshari') { A.turn = mine; antStart() }
  if (k === 'bingo' && !B.card.length) newCard()
  if (k === 'quiz') { if (!Q.order.length) Q.order = shuffle(QUIZ.map((_, i) => i)); Q.who ??= mine }
  if (k === 'charades') { C.who ??= mine; nextFilm() }
  game.value = k
}

onMounted(startTrip)
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.center { text-align: center; }
.score { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; text-align: center; gap: 8px; margin-top: 6px; }
.score .t { display: grid; gap: 2px; }
.score .t b { font-size: 52px; line-height: 1; color: #fff; font-weight: 400; }
.score .t span { font-size: 13px; font-weight: 700; display: inline-flex; gap: 6px; align-items: center; justify-content: center; }
.score .vs { color: var(--gold); font-size: 20px; }
.score-sub { margin-top: 10px; font-size: 12.5px; text-align: center; opacity: .85; }
.games { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.game { position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: 22px; padding: 14px 12px 12px; background: var(--card); text-align: left; display: grid; gap: 4px; min-height: 150px; align-content: start; box-shadow: 0 14px 26px -20px rgba(90, 11, 22, .45); font: inherit; color: var(--ink); cursor: pointer; }
.game::before { content: ""; position: absolute; inset: 0 0 auto; height: 6px; background: var(--g); }
.game .em { width: 50px; height: 50px; border-radius: 16px; display: grid; place-items: center; font-size: 26px; background: color-mix(in srgb, var(--g) 16%, white); margin: 6px 0 4px; }
.game b { font-weight: 400; font-size: 20px; line-height: 1.1; }
.game small { font-size: 12px; color: var(--ink-2); line-height: 1.35; }
.game .who { position: absolute; right: 10px; top: 16px; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); }
.feed { display: grid; gap: 6px; }
.feed > div { display: flex; gap: 8px; align-items: center; font-size: 13px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 8px 12px; }
.feed span { margin-left: auto; font-size: 11px; color: var(--ink-2); white-space: nowrap; }

.g-turn { display: flex; justify-content: center; margin: 2px 0 10px; }
.g-turn span { border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 800; color: #fff; }
.g-big { position: relative; border-radius: 26px; padding: 22px 16px; text-align: center; color: #FFE7B0; background: var(--jaali), radial-gradient(120% 90% at 85% 0%, #8E1A24 0%, var(--kumkum) 62%); }
.letter { font-size: 96px; line-height: 1.05; color: var(--gold); }
.letter small { display: block; font-family: 'Hind', sans-serif; font-size: 15px; font-weight: 600; color: #FFE7B0; }
.movie { font-size: 34px; line-height: 1.1; margin: 10px 0 4px; }
.hint { font-size: 12px; opacity: .8; }
.timer { height: 6px; border-radius: 3px; background: var(--sandal); overflow: hidden; margin: 12px 0 2px; }
.timer i { display: block; height: 100%; background: var(--marigold); transform-origin: left; transition: transform 1s linear; }
.timer.low i { background: var(--sindoor); }
.btn2.one { grid-template-columns: 1fr; }
.bingo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.bingo button { aspect-ratio: 1; border: 2px solid var(--line); border-radius: 14px; background: var(--card); font: inherit; font-size: 10.5px; font-weight: 700; line-height: 1.15; padding: 4px; display: grid; place-items: center; align-content: center; gap: 2px; color: var(--ink); cursor: pointer; }
.bingo button span { font-size: 20px; }
.bingo button.on { border-color: var(--marigold); background: #FFE9C4; }
.bingo button.win { border-color: var(--ok); background: #DDF2E4; }
.quiz-q { font-size: 24px; line-height: 1.15; margin: 4px 0 12px; }
.quiz-o { display: grid; gap: 8px; }
.quiz-o button { border: 2px solid var(--line); border-radius: 16px; background: var(--card); padding: 12px 14px; text-align: left; font: inherit; font-weight: 600; font-size: 15px; color: var(--ink); cursor: pointer; }
.quiz-o button.right { border-color: var(--ok); background: #DDF2E4; }
.quiz-o button.wrong { border-color: var(--sindoor); background: #FBE0DE; }
.g-car { display: flex; gap: 6px; justify-content: center; margin: 4px 0 10px; }
.g-car button { border: 2px solid var(--line); border-radius: 999px; background: var(--card); padding: 5px 12px; font: inherit; font-size: 12px; font-weight: 800; display: inline-flex; gap: 6px; align-items: center; color: var(--ink); cursor: pointer; }
.g-car button.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 14%, white); }
</style>
