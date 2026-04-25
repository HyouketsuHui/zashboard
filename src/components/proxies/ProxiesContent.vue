<script setup lang="ts">
import { useCalculateMaxProxies } from '@/composables/proxiesScroll'
import { handlerProxySelect } from '@/store/proxies'
import { computed } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'
import SmartGroupControls from './SmartGroupControls.vue'

const props = defineProps<{
  name: string
  now?: string
  renderProxies: string[]
}>()

const { maxProxies } = useCalculateMaxProxies(
  props.renderProxies.length,
  props.renderProxies.indexOf(props.now ?? ''),
)
const proxies = computed(() => props.renderProxies.slice(0, maxProxies.value))
</script>

<template>
  <div class="flex flex-col gap-2">
    <SmartGroupControls :group-name="name" />
    <ProxyNodeGrid>
      <ProxyNodeCard
        v-for="node in proxies"
        :key="node"
        :name="node"
        :group-name="name"
        :active="node === now"
        @click.stop="handlerProxySelect(name, node)"
      />
    </ProxyNodeGrid>
  </div>
</template>
