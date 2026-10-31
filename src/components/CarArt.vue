<template>
  <!-- Side-view car: Triber is drawn as a tall MPV, everything else as a hatchback. -->
  <svg viewBox="0 0 220 96" aria-hidden="true" class="car-art">
    <defs>
      <linearGradient :id="`${uid}b`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".98" /><stop offset=".55" stop-color="#F7EFE2" /><stop offset="1" stop-color="#D8CBB8" />
      </linearGradient>
      <linearGradient :id="`${uid}g`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5B4E63" /><stop offset=".5" stop-color="#2E2533" /><stop offset="1" stop-color="#4A3F52" />
      </linearGradient>
    </defs>
    <ellipse cx="110" cy="86" rx="96" ry="6" fill="#000" opacity=".22" />
    <path :d="shape.body" :fill="`url(#${uid}b)`" />
    <path d="M14 62h192v8H14z" :fill="color" opacity=".9" />
    <g :fill="`url(#${uid}g)`"><path v-for="d in shape.glass" :key="d" :d="d" /></g>
    <path d="M80 22l8 0-14 15h-6z" fill="#fff" opacity=".25" />
    <rect x="196" y="48" width="9" height="6" rx="3" fill="#FFE7B0" />
    <rect x="15" y="46" width="6" height="8" rx="2" fill="#B5121B" />
    <path d="M118 44h10" stroke="#B5A48E" stroke-width="2" stroke-linecap="round" />
    <g v-for="cx in [56, 170]" :key="cx" :transform="`translate(${cx} 72)`">
      <circle r="15" fill="#2A2026" /><circle r="9" fill="#F5C24A" /><circle r="4" fill="#5A0B16" />
      <g stroke="#B8862B" stroke-width="1.5"><line v-for="a in [0, 60, 120]" :key="a" x1="0" y1="-8" x2="0" y2="8" :transform="`rotate(${a})`" /></g>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ kind: { type: String, default: 'hatch' }, color: { type: String, required: true } })
const uid = `car${Math.random().toString(36).slice(2, 8)}` // gradient ids must be unique per instance

const SHAPES = {
  mpv: {
    body: 'M14 70V52c0-7 5-12 13-13l24-4 22-19c5-4 10-5 17-5h60c8 0 13 3 17 8l15 19c9 2 14 7 14 15v17z',
    glass: ['M78 19h22v20H55z', 'M104 19h34v20h-34z', 'M142 19h16c4 0 7 2 9 5l11 15h-36z'],
  },
  hatch: {
    body: 'M18 70V54c0-7 5-11 12-13l22-7 22-17c5-4 10-5 17-5h48c8 0 13 3 18 9l16 20c10 2 15 7 15 15v14z',
    glass: ['M78 21h28v19H58z', 'M110 21h22c4 0 7 2 9 5l12 14h-43z'],
  },
}
const shape = computed(() => SHAPES[props.kind] ?? SHAPES.hatch)
</script>
