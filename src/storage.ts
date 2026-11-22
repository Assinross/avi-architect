import { isBuildingModel, isRecord, issues, rules, type CityWorld } from './model'
import { isCityLandmark } from './city-landmark'

export const saveKey = 'architects-of-time.valley'
const version = 3

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
  const validDraft = value.draft === null || (
    value.accepted && isBuildingModel(value.draft) && value.draft.purpose === quest
  )
  if (!validDraft) return false
  if (!Object.prototype.hasOwnProperty.call(value, 'landmark') ||
      !(value.landmark === null || isCityLandmark(value.landmark)) ||
      (value.landmark && !(value.buildings.home && value.buildings.bakery)) ||
      !isRecord(value.careerPlans)) return false
  for (const [lot, plan] of Object.entries(value.careerPlans)) {
    if ((lot !== 'home' && lot !== 'bakery') ||
        !value.buildings[lot] || !isCityLandmark(plan)) return false
  }
  return true
}

// Development saves are deliberately disposable: no migration or compatibility decoder.
export function decode(raw: string): CityWorld | null {
  try {
    const envelope: unknown = JSON.parse(raw)
    if (!isRecord(envelope)) return null
    switch (envelope.version) {
      case 3: return validWorld(envelope.world) ? envelope.world : null
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
