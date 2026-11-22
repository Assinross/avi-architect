export type Point = [number, number]
export type Purpose = 'home' | 'bakery'
export type Theme = 0 | 1 | 2 | 3
export interface Wall { id: string; a: Point; b: Point }
export interface Opening { wallId: string; offset: number; kind: 'door' | 'window' }
export interface BuildingModel {
  purpose: Purpose
  seed: number
  walls: Wall[]
  openings: Opening[]
}

export interface CityWorld {
  buildings: Partial<Record<Purpose, BuildingModel>>
  theme: Theme
  quality: 'auto' | 'low' | 'high'
  draft: BuildingModel | null
  accepted: boolean
  rewards: number
}

export const rules = {
  home: { minArea: 12, windows: 1, budget: 500, reward: 1 },
  bakery: { minArea: 20, windows: 2, budget: 700, reward: 2 },
} as const
export const prices = { wall: 12, door: 45, window: 30, surface: 4 } as const
export const plot = { width: 12, depth: 10 } as const

export function freshWorld(): CityWorld {
  return { buildings: {}, theme: 0, quality: 'auto', draft: null, accepted: false, rewards: 0 }
}

export function newModel(purpose: Purpose): BuildingModel {
  return { purpose, walls: [], openings: [], seed: Math.floor(Math.random() * 0x7fffffff) }
}

export function currentQuest(world: CityWorld): Purpose | null {
  if (!world.buildings.home) return 'home'
  return world.buildings.bakery ? null : 'bakery'
}

export function wallLength(wall: Wall): number {
  return Math.abs(wall.a[0] - wall.b[0]) + Math.abs(wall.a[1] - wall.b[1])
}

const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1]
const isPoint = (p: unknown): p is Point => Array.isArray(p) && p.length === 2 && p.every(Number.isSafeInteger)
const inBounds = ([x, y]: Point) => x >= 0 && x <= plot.width && y >= 0 && y <= plot.depth
const between = (n: number, a: number, b: number) => Math.min(a,b) <= n && n <= Math.max(a,b)

// Adjacent sides may meet at shared endpoints. A T-junction or crossing is ambiguous.
function conflicts(first: Wall, second: Wall): boolean {
  const axis = first.a[1] === first.b[1] ? 0 : 1
  const across = axis === 0 ? 1 : 0
  if (second.a[across] === second.b[across]) {
    if (first.a[across] !== second.a[across]) return false
    const left = Math.max(Math.min(first.a[axis], first.b[axis]), Math.min(second.a[axis], second.b[axis]))
    const right = Math.min(Math.max(first.a[axis], first.b[axis]), Math.max(second.a[axis], second.b[axis]))
    return left < right
  }
  const intersects = between(second.a[axis], first.a[axis], first.b[axis]) &&
    between(first.a[across], second.a[across], second.b[across])
  return intersects && ![first.a, first.b].some(p => same(p, second.a) || same(p, second.b))
}

function wallProblem(walls: Wall[], wall: Wall): string | null {
  if (!isPoint(wall.a) || !isPoint(wall.b)) return 'Выбери две точки на сетке.'
  if (!inBounds(wall.a) || !inBounds(wall.b)) return 'Стена выходит за границы участка.'
  if (same(wall.a, wall.b)) return 'Выбери другую точку для конца стены.'
  if (wall.a[0] !== wall.b[0] && wall.a[1] !== wall.b[1]) return 'Проведи стену по горизонтали или вертикали.'
  if (walls.some(other => conflicts(other, wall))) return 'Стены могут встречаться только концами.'
  return null
}

function openingProblem(model: BuildingModel, opening: Opening): string | null {
  const wall = model.walls.find(item => item.id === opening.wallId)
  if (!wall) return 'Сначала выбери стену.'
  const offset = opening.offset
  if (!Number.isInteger(offset - 0.5) || offset <= 0 || offset >= wallLength(wall)) {
    return 'Выбери метровый отрезок на стене.'
  }
  if (model.openings.some(item => item.wallId === wall.id && item.offset === offset)) return 'Здесь уже есть проём.'
  return null
}

// The four complete boundary sides define the only supported footprint.
export function area(model: BuildingModel): number {
  if (model.walls.length !== 4) return 0
  const points = model.walls.flatMap(w => [w.a, w.b])
  const xs = [...new Set(points.map(p => p[0]))].sort((a,b) => a-b)
  const ys = [...new Set(points.map(p => p[1]))].sort((a,b) => a-b)
  if (xs.length !== 2 || ys.length !== 2) return 0
  const corners: Point[] = [[xs[0],ys[0]], [xs[1],ys[0]], [xs[1],ys[1]], [xs[0],ys[1]]]
  const closed = corners.every((p, i) => {
    const q = corners[(i + 1) % 4]
    return model.walls.some(w => (same(w.a, p) && same(w.b, q)) || (same(w.a, q) && same(w.b, p)))
  })
  return closed ? (xs[1] - xs[0]) * (ys[1] - ys[0]) : 0
}

export function cost(model: BuildingModel): number {
  const walls = model.walls.reduce((sum,w) => sum + wallLength(w) * prices.wall, 0)
  const fittings = model.openings.reduce((sum,o) => sum + (o.kind === 'door' ? prices.door : prices.window), 0)
  return walls + fittings + area(model) * prices.surface
}

export function issues(model: BuildingModel): string[] {
  const goal = rules[model.purpose]
  const messages: string[] = []
  if (!isBuildingModel(model)) return ['Исправь стены и проёмы в границах участка.']
  const size = area(model)
  if (!size) messages.push('Замкни прямоугольник четырьмя стенами.')
  else if (size < goal.minArea) messages.push(`Увеличь площадь до ${goal.minArea} м².`)
  if (!model.openings.some(o => o.kind === 'door')) messages.push('Нужна входная дверь.')
  if (model.openings.filter(o => o.kind === 'window').length < goal.windows) {
    messages.push(goal.windows === 1 ? 'Добавь хотя бы одно окно.' : 'Добавь минимум два окна.')
  }
  if (cost(model) > goal.budget) messages.push('Стоимость превышает бюджет.')
  return messages
}

export function complete(world: CityWorld, model: BuildingModel): CityWorld {
  if (!world.accepted || currentQuest(world) !== model.purpose) throw new Error('Сначала прими текущий заказ.')
  const problems = issues(model)
  if (problems.length) throw new Error(problems.join(' '))
  return {
    ...world, buildings: { ...world.buildings, [model.purpose]: structuredClone(model) }, draft: null,
    accepted: false, rewards: world.rewards + rules[model.purpose].reward,
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isBuildingModel(value: unknown): value is BuildingModel {
  if (!isRecord(value) || (value.purpose !== 'home' && value.purpose !== 'bakery') ||
      !Number.isSafeInteger(value.seed) || !Array.isArray(value.walls) || value.walls.length > 262 ||
      !Array.isArray(value.openings) || value.openings.length > 262) return false
  const checked: BuildingModel = { purpose: value.purpose, seed: Number(value.seed), walls: [], openings: [] }
  for (const item of value.walls) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.length || item.id.length > 100 ||
        checked.walls.some(w => w.id === item.id) || !isPoint(item.a) || !isPoint(item.b)) return false
    const wall: Wall = { id: item.id, a: item.a, b: item.b }
    if (wallProblem(checked.walls, wall)) return false
    checked.walls.push(wall)
  }
  for (const item of value.openings) {
    if (!isRecord(item) || (item.kind !== 'window' && item.kind !== 'door') ||
        typeof item.offset !== 'number' || typeof item.wallId !== 'string') return false
    const opening: Opening = { kind: item.kind, offset: item.offset, wallId: item.wallId }
    if (openingProblem(checked, opening)) return false
    checked.openings.push(opening)
  }
  return true
}

export class History {
  private past: BuildingModel[] = []
  private future: BuildingModel[] = []
  private current: BuildingModel

  constructor(model: BuildingModel) { this.current = structuredClone(model) }
  get model() { return this.current }
  get canUndo() { return this.past.length > 0 }
  get canRedo() { return this.future.length > 0 }

  private record(next: BuildingModel): null {
    this.past.push(this.current)
    this.current = next
    this.future = []
    return null
  }

  addWall(a: Point, b: Point): string | null {
    const next: Wall = { id: `w-${a.join('-')}-${b.join('-')}`, a: [...a], b: [...b] }
    const problem = wallProblem(this.current.walls, next)
    if (problem) return problem
    return this.record({ ...this.current, walls: [...this.current.walls, next] })
  }

  removeWall(id: string): string | null {
    if (!this.current.walls.some(w => w.id === id)) return 'Выбери стену для удаления.'
    return this.record({ ...this.current, walls: this.current.walls.filter(w => w.id !== id),
      openings: this.current.openings.filter(o => o.wallId !== id) })
  }

  private addOpening(opening: Opening): string | null {
    const problem = openingProblem(this.current, opening)
    if (problem) return problem
    return this.record({ ...this.current, openings: [...this.current.openings, opening] })
  }

  addDoor(wallId: string, offset: number) { return this.addOpening({ kind: 'door', wallId, offset }) }
  addWindow(wallId: string, offset: number) { return this.addOpening({ kind: 'window', wallId, offset }) }

  removeOpening(wallId: string, offset: number): string | null {
    const openings = this.current.openings.filter(o => o.wallId !== wallId || o.offset !== offset)
    if (openings.length === this.current.openings.length) return 'Выбери проём для удаления.'
    return this.record({ ...this.current, openings })
  }

  undo(): string | null {
    const previous = this.past.pop()
    if (!previous) return 'Пока нечего отменять.'
    this.future.push(this.current)
    this.current = previous
    return null
  }

  redo(): string | null {
    const next = this.future.pop()
    if (!next) return 'Пока нечего повторять.'
    this.past.push(this.current)
    this.current = next
    return null
  }
}
