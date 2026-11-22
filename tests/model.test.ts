import { afterEach, describe, expect, it, vi } from 'vitest'
import { area, complete, cost, currentQuest, freshWorld, History, issues, newModel, rules,
  type BuildingModel, type Point, type Purpose } from '../src/model'
import { clear, decode, load, save, saveKey } from '../src/storage'

function rectangle(purpose: Purpose = 'home', w = 4, d = 3) {
  const h = new History(newModel(purpose))
  const points: Point[] = [[1,1], [1+w,1], [1+w,1+d], [1,1+d]]
  // Mixed segment direction and entry order are legitimate.
  for (const [i,j] of [[1,0], [2,3], [2,1], [3,0]]) expect(h.addWall(points[i], points[j])).toBeNull()
  return h
}

function finished(purpose: Purpose = 'home'): BuildingModel {
  const h = purpose === 'home' ? rectangle() : rectangle(purpose, 5, 4)
  const side = h.model.walls[0].id
  expect(h.addDoor(side, 0.5)).toBeNull()
  for (let n = 1; n <= rules[purpose].windows; n++) expect(h.addWindow(side, n + 0.5)).toBeNull()
  return h.model
}

describe('Редактирование плана', () => {
  it('учитывает границы, шаг, ориентацию и пересечения', () => {
    const h = new History(newModel('home'))
    expect(h.addWall([0,0],[12,0])).toBeNull()
    expect(h.addWall([12,0],[12,10])).toBeNull()
    const valid = h.model
    for (const [a,b] of [
      [[0,0],[0,0]], [[1,0],[1,5]], [[0,0],[-1,0]], [[12,10],[13,10]],
      [[0,0],[0,11]], [[0,0],[2,2]], [[0,0],[0,2.5]], [[12,0],[0,0]],
      [[2,0],[5,0]],
    ] as [Point,Point][]) expect(h.addWall(a,b)).toBeTruthy()
    expect(h.model).toBe(valid)
  })

  it('отклоняет сквозное пересечение и разрешает смежные отрезки', () => {
    const h = new History(newModel('home'))
    h.addWall([1,2],[4,2])
    expect(h.addWall([3,1],[3,4])).toBeTruthy()
    expect(h.addWall([4,2],[5,2])).toBeNull()
  })

  it('распознаёт контур независимо от направления и проверяет минимальную площадь', () => {
    const h = rectangle()
    expect(area(h.model)).toBe(12)
    expect(issues(rectangle('home',2,3).model).join(' ')).toContain('12 м²')
    h.removeWall(h.model.walls[1].id)
    expect(area(h.model)).toBe(0)
    expect(issues(h.model).join(' ')).toContain('Замкни')
  })

  it('привязывает дверь и окно только к свободным метрам существующей стены', () => {
    const h = rectangle()
    const id = h.model.walls[0].id
    expect(h.addWindow('missing',0.5)).toBeTruthy()
    for (const n of [-0.5,0,1,1.1,4.5,Infinity,NaN]) expect(h.addDoor(id,n)).toBeTruthy()
    expect(h.addWindow(id,0.5)).toBeNull()
    expect(h.addDoor(id,0.5)).toBeTruthy()
    expect(h.addDoor(id,1.5)).toBeNull()
    expect(issues(h.model)).toEqual([])
    expect(h.removeOpening(id,0.5)).toBeNull()
    expect(h.model.openings.map(o => o.kind)).toEqual(['door'])
  })

  it('считает стоимость по модели и возвращает стоимость элементов при удалении', () => {
    const h = new History(finished())
    expect(cost(h.model)).toBe(14 * 12 + 12 * 4 + 45 + 30)
    const wall = h.model.walls[0]
    h.removeWall(wall.id)
    expect(cost(h.model)).toBe(10 * 12)
    expect(h.model.openings).toHaveLength(0)
    expect(h.undo()).toBeNull()
    expect(h.model.openings).toHaveLength(2)
    expect(h.redo()).toBeNull()
    expect(h.model.openings).toHaveLength(0)
    h.undo()
    h.removeOpening(wall.id,0.5)
    expect(h.canRedo).toBe(false)
    expect(h.redo()).toBeTruthy()
  })

  it('показывает превышение бюджета и нехватку проёмов', () => {
    const h = rectangle('bakery',10,9)
    expect(issues(h.model)).toEqual(expect.arrayContaining([
      'Нужна входная дверь.', 'Добавь минимум два окна.', 'Стоимость превышает бюджет.',
    ]))
  })
})

describe('Прогресс и сохранения', () => {
  afterEach(() => vi.unstubAllGlobals())

  function memory() {
    const data = new Map<string,string>()
    vi.stubGlobal('localStorage', {
      getItem: (key:string) => data.get(key) ?? null,
      setItem: (key:string, value:string) => data.set(key,value),
      removeItem: (key:string) => data.delete(key),
    })
    return data
  }

  it('сдаёт только принятый заказ и оставляет обе модели на своих участках', () => {
    const world = freshWorld()
    const house = finished()
    expect(() => complete(world,house)).toThrow()
    world.accepted = true
    expect(() => complete(world,finished('bakery'))).toThrow()
    expect(() => complete(world,newModel('home'))).toThrow()
    const town = complete(world,house)
    expect(currentQuest(town)).toBe('bakery')
    expect(town.buildings.home).toEqual(house)
    expect(town.buildings.home).not.toBe(house)
    const done = complete({...town, accepted:true},finished('bakery'))
    expect(currentQuest(done)).toBeNull()
    expect(done.rewards).toBe(3)
    expect(done.buildings.home).toEqual(house)
    expect(done.accepted).toBe(false)
    expect(done.draft).toBeNull()
    memory()
    expect(save(done)).toBe(true)
    expect(load()).toEqual(done)
  })

  it('сохраняет незаконченный чертёж, настройки и внешний вид независимо', () => {
    memory()
    expect(load()).toBeNull()
    const draft = rectangle().model
    const world = {...freshWorld(), accepted:true, draft, theme:2 as const, quality:'low' as const}
    expect(save(world)).toBe(true)
    const resumed = load()!
    expect(resumed).toEqual(world)
    resumed.theme = 3
    expect(save(resumed)).toBe(true)
    expect(load()!.draft).toEqual(draft)
    expect(clear()).toBe(true)
    expect(load()).toBeNull()
  })

  it('отсекает повреждения формата, геометрии и последовательности заданий', () => {
    const data = memory()
    const home = finished()
    const base = freshWorld()
    for (const raw of ['', '{', 'null', '[]', JSON.stringify({version:99,world:base})]) {
      data.set(saveKey,raw)
      expect(load()).toBeNull()
    }
    for (const world of [
      {...base, rewards:1}, {...base, theme:4}, {...base, quality:'fast'},
      {...base, buildings:{bakery:finished('bakery')}, rewards:2}, {...base, draft:home},
      {...base, accepted:true, draft:{...home, openings:[{wallId:'missing', offset:0.5, kind:'door'}]}},
      {...base, accepted:true, draft:{...home, walls:[...home.walls, home.walls[0]]}},
      {...base, accepted:true, draft:{...home, walls:[{id:'x',a:[13,0],b:[13,3]}]}},
      {...base, buildings:{home:newModel('home')}, rewards:1},
    ]) expect(decode(JSON.stringify({version:3,world}))).toBeNull()
  })

  it('обрабатывает недоступное хранилище и ошибки квоты', () => {
    const fail = () => { throw Error('Storage unavailable') }
    vi.stubGlobal('localStorage', {getItem:fail,setItem:fail,removeItem:fail})
    expect(save(freshWorld())).toBe(false)
    expect(load()).toBeNull()
    expect(clear()).toBe(false)
  })
})

describe('Геометрия объёмного вида', () => {
  it('переносит проём со стены обратного направления и сохраняет план во всех темах', async () => {
    const { house } = await import('../src/rendering/building')
    const { disposeGroup, palettes } = await import('../src/rendering/art')
    const model = finished()
    const original = structuredClone(model)
    // The first wall starts at (5, 1) and points left. Its window is 1.5 m from the start.
    for (const [theme, palette] of palettes.entries()) {
      for (const roof of [false, true]) {
        const volume = house(model, palette, roof, theme)
        const glass = volume.userData.glass
        expect(glass).toHaveLength(1)
        expect(glass[0].position.x).toBe(3.5)
        expect(glass[0].position.z).toBe(1)
        expect(model).toEqual(original)
        disposeGroup(volume)
      }
    }
  })
})
