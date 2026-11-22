import { isBuildingModel, isRecord, issues, rules, type CityWorld } from './model'

export const saveKey = 'architects-of-time.valley'
const version = 1

function validWorld(value: unknown): value is CityWorld {
  if (!isRecord(value) || !isRecord(value.buildings) ||
      ![0, 1, 2, 3].some(theme => value.theme === theme) ||
      !['auto', 'low', 'high'].some(quality => value.quality === quality) ||
      typeof value.accepted !== 'boolean') return false

  let rewards = 0
  for (const [lot, model] of Object.entries(value.buildings)) {
    if (lot !== 'home' && lot !== 'bakery') return false
    if (!isBuildingModel(model) || model.purpose !== lot || issues(model).length) return false
    rewards += rules[lot].reward
  }

  if (value.rewards !== rewards || (value.buildings.bakery && !value.buildings.home)) return false
  const quest = !value.buildings.home ? 'home' : !value.buildings.bakery ? 'bakery' : null
  if (value.accepted && !quest) return false
  return value.draft === null || (
    value.accepted && isBuildingModel(value.draft) && value.draft.purpose === quest
  )
}

// Route each supported envelope version to its own decoder before accepting the world.
export function decode(raw: string): CityWorld | null {
  try {
    const envelope: unknown = JSON.parse(raw)
    if (!isRecord(envelope)) return null
    switch (envelope.version) {
      case 1: return validWorld(envelope.world) ? envelope.world : null
      default: return null
    }
  } catch { return null }
}

export function load(): CityWorld | null {
  try {
    const raw = localStorage.getItem(saveKey)
    return raw === null ? null : decode(raw)
  } catch { return null }
}

export function save(world: CityWorld): boolean {
  try {
    if (!validWorld(world)) return false
    localStorage.setItem(saveKey, JSON.stringify({ version, world }))
    return true
  } catch { return false }
}

export function clear(): boolean {
  try {
    localStorage.removeItem(saveKey)
    return true
  } catch { return false }
}
