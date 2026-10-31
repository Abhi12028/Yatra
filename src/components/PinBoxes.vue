<template>
  <label class="pins">
    <input :value="modelValue" inputmode="numeric" maxlength="4" autocomplete="one-time-code" :autofocus="autofocus"
      @input="onInput" />
    <span v-for="i in 4" :key="i" class="box display"
      :class="{ filled: modelValue[i - 1], active: modelValue.length === i - 1 }">{{ secret && modelValue[i - 1] ? '•' : modelValue[i - 1] }}</span>
  </label>
</template>

<script setup>
// 4-digit entry used for the trip code and PINs. Emits `complete` on the 4th digit.
const props = defineProps({ modelValue: { type: String, default: '' }, secret: Boolean, autofocus: Boolean })
const emit = defineEmits(['update:modelValue', 'complete'])

function onInput(e) {
  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
  e.target.value = v
  emit('update:modelValue', v)
  if (v.length === 4 && props.modelValue.length !== 4) emit('complete', v)
}
</script>

<style scoped>
.pins { position: relative; display: flex; gap: 12px; justify-content: center; }
.pins input { position: absolute; inset: 0; opacity: 0; font-size: 16px; }
.box {
  width: 64px;
  height: 72px;
  border-radius: 18px;
  background: var(--card);
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: 800;
  transition: border-color .15s, transform .15s;
}
.box.filled { border-color: var(--ink); }
.box.active { border-color: var(--marigold); transform: translateY(-2px); box-shadow: 0 0 0 4px rgba(232, 137, 12, .18); }
</style>
