import { GRID, footprint, validate, type MultiStoreyPlan, type FloorPlan } from './multistorey'
import { isRecord, type CityWorld } from './model'

/** Static city scene has a finite rendering budget; editing remains unlimited in the workshop. */
export const CITY_MAX_FLOORS = 24

function validPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 &&
    value.every((n, i) => Number.isSafeInteger(n) && n >= 0 && n <= (i === 0 ? GRID.width : GRID.depth))
}

function validWall(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 100 &&
    validPoint(value.a) && validPoint(value.b) &&
    ((value.a[0] === value.b[0] && value.a[1] !== value.b[1]) ||
     (value.a[1] === value.b[1] && value.a[0] !== value.b[0]))
}

function validFloor(value: unknown): value is FloorPlan {
  if (!isRecord(value) || !Array.isArray(value.walls) || value.walls.length !== 4 ||
      !Array.isArray(value.partitions) || value.partitions.length > 160 ||
      !Array.isArray(value.openings) || value.openings.length > 256) return false
  if (![...value.walls, ...value.partitions].every(validWall)) return false
  const wallIds = [...value.walls, ...value.partitions].map((wall: {id:string})=>wall.id)
  if (new Set(wallIds).size !== wallIds.length) return false
  if (!value.openings.every((opening: unknown) =>
    isRecord(opening) && typeof opening.wallId === 'string' &&
    (opening.kind === 'door' || opening.kind === 'window') &&
    typeof opening.offset === 'number' && Number.isFinite(opening.offset))) return false
  const stair = value.stairToNext
  return stair === null || (isRecord(stair) &&
    Number.isSafeInteger(stair.x) && Number.isSafeInteger(stair.z) &&
    ['north','south','east','west'].includes(String(stair.facing)))
}

/** Validate untrusted, persisted geometry before passing it to Three.js. */
export function isCityLandmark(value: unknown): value is MultiStoreyPlan {
  if (!isRecord(value) || !Array.isArray(value.floors) ||
      value.floors.length < 1 || value.floors.length > CITY_MAX_FLOORS ||
      !value.floors.every(validFloor)) return false
  const plan = value as unknown as MultiStoreyPlan
  if (validate(plan).length || plan.floors.some(f=>!footprint(f))) return false
  const outerDoor = plan.floors[0].openings.some(o =>
    o.kind === 'door' && plan.floors[0].walls.some(w=>w.id === o.wallId))
  const daylight = plan.floors.some(f=>f.openings.some(o =>
    o.kind === 'window' && f.walls.some(w=>w.id === o.wallId)))
  return outerDoor && daylight
}

/** Publish is deliberately independent of quest rewards and original building models. */
export function publishLandmark(world: CityWorld, plan: MultiStoreyPlan): CityWorld {
  if (!world.buildings.home || !world.buildings.bakery)
    throw new Error('Сначала выполни заказы Эммы и пекаря Льва.')
  if (plan.floors.length > CITY_MAX_FLOORS)
    throw new Error('Для размещения в городе доступно не более 24 этажей; в мастерской можно проектировать выше.')
  if (!isCityLandmark(plan))
    throw new Error('Исправь план, добавь наружную входную дверь и хотя бы одно окно.')
  return {...world, landmark:structuredClone(plan)}
}
