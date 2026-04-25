<template>
  <div
    v-if="isVisible"
    class="bg-base-200/50 flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
  >
    <div class="min-w-0 flex-1 truncate">
      <span class="font-medium">{{ $t('smartAlgorithm') }}:</span>
      <span class="ml-1 font-mono">{{ smartAlgorithmText }}</span>
      <span class="mx-1">|</span>
      <span class="font-medium">{{ $t('smartHysteresis') }}:</span>
      <span class="ml-1 font-mono">{{ smartHysteresisText }}</span>
    </div>

    <select
      class="select select-xs min-w-36 max-w-full"
      :value="selectedAlgorithm"
      :disabled="isSwitching || !algorithmOptions.length"
      @pointerdown.stop
      @touchstart.stop
      @touchend.stop
      @click.stop
      @change.stop="handlerSwitchAlgorithm"
    >
      <option
        v-if="!selectedAlgorithm"
        value=""
        disabled
      >
        {{ $t('unknown') }}
      </option>
      <option
        v-for="algorithm in algorithmOptions"
        :key="algorithm"
        :value="algorithm"
      >
        {{ algorithm }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { isSmartGroupFeatureSupported } from '@/api'
import { PROXY_TYPE } from '@/constant'
import { showNotification } from '@/helper/notification'
import { proxyMap } from '@/store/proxies'
import {
  SMART_GROUP_ALGORITHMS,
  smartAlgorithmMap,
  smartHysteresisMap,
  switchSmartGroupAlgorithm,
} from '@/store/smart'
import type { SmartGroupAlgorithm } from '@/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  groupName: string
}>()

const { t } = useI18n()
const isSwitching = ref(false)
const selectedAlgorithm = ref('')
const currentAlgorithm = computed(() => smartAlgorithmMap.value[props.groupName] ?? '')
const algorithmOptions = computed(() => {
  const options = [...SMART_GROUP_ALGORITHMS]

  if (
    currentAlgorithm.value &&
    !options.includes(currentAlgorithm.value as SmartGroupAlgorithm)
  ) {
    return [currentAlgorithm.value, ...options]
  }

  return options
})
const isVisible = computed(() => {
  return (
    isSmartGroupFeatureSupported.value &&
    proxyMap.value[props.groupName]?.type.toLowerCase() === PROXY_TYPE.Smart
  )
})
const smartAlgorithmText = computed(() => {
  return currentAlgorithm.value || t('unknown')
})
const smartHysteresisText = computed(() => {
  return smartHysteresisMap.value[props.groupName] || t('unknown')
})

watch(
  currentAlgorithm,
  (value) => {
    selectedAlgorithm.value = value
  },
  { immediate: true },
)

const handlerSwitchAlgorithm = async (e: Event) => {
  const algorithm = (e.target as HTMLSelectElement).value

  if (!algorithm || algorithm === currentAlgorithm.value || isSwitching.value) {
    return
  }

  isSwitching.value = true
  selectedAlgorithm.value = algorithm

  try {
    await switchSmartGroupAlgorithm(props.groupName, algorithm)
    showNotification({
      content: 'switchSmartAlgorithmSuccess',
      params: { algorithm },
      type: 'alert-success',
    })
  } catch {
    showNotification({
      content: 'switchSmartAlgorithmFailed',
      type: 'alert-error',
    })
  } finally {
    isSwitching.value = false
    selectedAlgorithm.value = smartAlgorithmMap.value[props.groupName] ?? ''
  }
}
</script>
