import {
  fetchSmartGroupInfoAPI,
  fetchSmartGroupWeightsAPI,
  fetchSmartGroupWeightsLegacyAPI,
  fetchSmartWeightsAPI,
  isSmartGroupFeatureSupported,
  updateSmartGroupAlgorithmAPI,
} from '@/api'
import type { NodeRank, SmartGroupAlgorithm } from '@/types'
import { ref } from 'vue'

export const SMART_GROUP_ALGORITHMS: SmartGroupAlgorithm[] = [
  'strict-best',
  'weighted-random',
  'least-loaded',
  'fastest-recent',
  'sticky-session',
  'round-robin',
  'weighted-rr',
  'p2c',
  'latency-banded',
  'consistent-hashing',
]

export const smartWeightsMap = ref<Record<string, Record<string, string>>>({})
export const smartOrderMap = ref<Record<string, Record<string, number>>>({})
export const smartAlgorithmMap = ref<Record<string, string>>({})
export const smartHysteresisMap = ref<Record<string, string>>({})

const getNodeName = (weight: NodeRank) => {
  return weight.name ?? weight.Name ?? ''
}

const getNodeRank = (weight: NodeRank) => {
  const rank = weight.rank ?? weight.Rank

  return rank == null ? '' : `${rank}`
}

const getNodeOrder = (rank: string, index: number) => {
  const rankNumber = Number(rank)

  if (!Number.isFinite(rankNumber)) {
    return index
  }

  return rankNumber
}

const restructWeights = (proxyName: string, weights: NodeRank[]) => {
  const smartWeights: Record<string, string> = {}
  const smartOrder: Record<string, number> = {}

  weights.forEach((weight, index) => {
    const name = getNodeName(weight)
    const rank = getNodeRank(weight)

    if (!name || !rank) {
      return
    }

    smartWeights[name] = rank
    smartOrder[name] = getNodeOrder(rank, index)
  })

  smartWeightsMap.value[proxyName] = smartWeights
  smartOrderMap.value[proxyName] = smartOrder
}

const parseWeights = (data: unknown): NodeRank[] => {
  if (Array.isArray(data)) {
    return data as NodeRank[]
  }

  if (!data || typeof data !== 'object') {
    return []
  }

  const payload = data as { weights?: unknown }

  if (Array.isArray(payload.weights)) {
    return payload.weights as NodeRank[]
  }

  return []
}

const formatSmartGroupValue = (value: unknown) => {
  if (value == null) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`
  }

  try {
    return JSON.stringify(value)
  } catch {
    return `${value}`
  }
}

const saveSmartGroupInfo = (
  proxyName: string,
  info: {
    algorithm?: string
    hysteresis?: unknown
  },
) => {
  if (typeof info.algorithm === 'string' && info.algorithm) {
    smartAlgorithmMap.value[proxyName] = info.algorithm
  } else {
    delete smartAlgorithmMap.value[proxyName]
  }

  const hysteresis = formatSmartGroupValue(info.hysteresis)

  if (hysteresis) {
    smartHysteresisMap.value[proxyName] = hysteresis
  } else {
    delete smartHysteresisMap.value[proxyName]
  }
}

// deprecated
const fetchSmartGroupWeightsLegacy = async (proxyName: string) => {
  const res = await fetchSmartGroupWeightsLegacyAPI(proxyName)

  if (res.status !== 200) return false

  const weights = parseWeights(res.data)

  if (!weights.length) return true

  restructWeights(proxyName, weights)
  return true
}

const fetchSmartGroupWeights = async (proxyName: string) => {
  const res = await fetchSmartGroupWeightsAPI(proxyName)

  if (res.status === 200) {
    const weights = parseWeights(res.data)

    if (weights.length) {
      restructWeights(proxyName, weights)
    }

    return
  }

  await fetchSmartGroupWeightsLegacy(proxyName)
}

const fetchSmartGroupInfo = async (proxyName: string) => {
  try {
    const res = await fetchSmartGroupInfoAPI(proxyName)

    if (res.status !== 200) {
      return
    }

    saveSmartGroupInfo(proxyName, res.data)
  } catch {
    // ignore runtime info fetch failures for compatibility with legacy kernels
  }
}

export const refreshSmartGroupData = async (proxyName: string) => {
  await Promise.all([fetchSmartGroupInfo(proxyName), fetchSmartGroupWeights(proxyName)])
}

export const switchSmartGroupAlgorithm = async (
  proxyName: string,
  algorithm: SmartGroupAlgorithm | string,
) => {
  await updateSmartGroupAlgorithmAPI(proxyName, algorithm)
  smartAlgorithmMap.value[proxyName] = algorithm
  await refreshSmartGroupData(proxyName)
}

export const initSmartWeights = async (smartGroups: string[]) => {
  smartWeightsMap.value = {}
  smartOrderMap.value = {}
  smartAlgorithmMap.value = {}
  smartHysteresisMap.value = {}

  if (!smartGroups.length) {
    return
  }

  if (isSmartGroupFeatureSupported.value) {
    await Promise.all(smartGroups.map((name) => refreshSmartGroupData(name)))
    return
  }

  const { status, data: smartWeights } = await fetchSmartWeightsAPI()

  if (status !== 200) {
    // deprecated fallback
    await Promise.all(smartGroups.map((name) => fetchSmartGroupWeightsLegacy(name)))
    return
  }

  const allWeights = smartWeights?.weights ?? {}

  for (const [group, weights] of Object.entries(allWeights)) {
    if (!weights?.length) continue

    restructWeights(group, weights)
  }
}
