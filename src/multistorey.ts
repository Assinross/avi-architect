/**
 * Architects of Time — multi-storey planning core.
 * Pure geometry: no Three.js, DOM, network, or localStorage dependency.
 * Coordinates are metres on the existing 12 × 10 planning grid.
 * Each level is 3.2m high; no arbitrary maximum storey count is imposed.
 */
export type Point = readonly [number, number]
export type Facing = 'north' | 'south' | 'east' | 'west'
export type OpeningKind = 'door' | 'window'

export interface Wall { id: string; a: Point; b: Point }
export interface Opening { wallId: string; offset: number; kind: OpeningKind }
export interface Staircase { x: number; z: number; facing: Facing }
export interface FloorPlan {
  walls: Wall[]
  openings: Opening[]
  /** Interior non-load-bearing walls. Can meet perimeter walls at T-junctions. */
  partitions: Wall[]
  /** Stairs rising from THIS floor to the NEXT floor. */
  stairToNext: Staircase | null
}
export interface MultiStoreyPlan {
  floors: FloorPlan[]
}
export interface Rect { x0: number; z0: number; x1: number; z1: number }
export interface Column {
  x: number
  z: number
  /** 0-based index of the floor whose underside requires support. */
  upperFloor: number
  /** 0-based index of highest supporting floor; -1 means ground. */
  groundedOn: number
  /** Scene-space/metres vertical span; columns end beneath the upper floor. */
  fromY: number
  toY: number
}
export interface RoofSection extends Rect {
  /** 0-based floor above which this section is placed. */
  floor: number
  y: number
  kind: 'top' | 'setback'
}
export interface Estimate {
  outerWalls: number
  partitions: number
  openings: number
  slabs: number
  stairs: number
  columns: number
  roofs: number
  total: number
}

export const STOREY_HEIGHT = 3.2
export const STAIR_WIDTH = 2
export const STAIR_LENGTH = 3
export const COLUMN_SPACING = 3
export const GRID = { width: 12, depth: 10 } as const
export const BUILD_PRICES = {
  wallPerMetre: 12, partitionPerMetre: 8, door: 45, window: 30,
  slabPerSquareMetre: 4, roofPerSquareMetre: 3, stair: 135,
  columnPerMetre: 22,
} as const

const integer = (n: number) => Number.isSafeInteger(n)
const validPoint = (p: Point) => p.length === 2 && p.every(integer)
const isAxis = (w: Wall) => (w.a[0] === w.b[0]) !== (w.a[1] === w.b[1])
const coordsEqual = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1]
const includes = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
const inner = (r: Rect, x: number, z: number) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1
const sameRect = (a: Rect, b: Rect) => a.x0 === b.x0 && a.x1 === b.x1 && a.z0 === b.z0 && a.z1 === b.z1
const inGrid = (r: Rect) => r.x0 >= 0 && r.z0 >= 0 && r.x1 <= GRID.width && r.z1 <= GRID.depth

export const rectangleArea = (r: Rect) => Math.max(0, r.x1-r.x0) * Math.max(0, r.z1-r.z0)
export const wallLength = (w: Wall) => Math.abs(w.a[0]-w.b[0])+Math.abs(w.a[1]-w.b[1])

/** Returns null for an incomplete or non-rectangular floor (drafts are allowed). */
export function footprint(floor: FloorPlan): Rect | null {
  if (floor.walls.length !== 4) return null
  const endpoints = floor.walls.flatMap(w => [w.a, w.b])
  if (!endpoints.every(validPoint) || !floor.walls.every(isAxis)) return null
  const xs = [...new Set(endpoints.map(p=>p[0]))].sort((a,b)=>a-b)
  const zs = [...new Set(endpoints.map(p=>p[1]))].sort((a,b)=>a-b)
  if (xs.length !== 2 || zs.length !== 2) return null
  const r = {x0:xs[0],z0:zs[0],x1:xs[1],z1:zs[1]}
  if (!rectangleArea(r) || !inGrid(r)) return null
  const corners: Point[] = [[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]]
  return corners.every((p,i) => {
    const q = corners[(i+1)%4]
    return floor.walls.some(w => (coordsEqual(w.a,p)&&coordsEqual(w.b,q)) ||
      (coordsEqual(w.a,q)&&coordsEqual(w.b,p)))
  }) ? r : null
}

export function stairRect(stair: Staircase): Rect {
  const eastWest = stair.facing === 'east' || stair.facing === 'west'
  const w = eastWest ? STAIR_LENGTH : STAIR_WIDTH
  const d = eastWest ? STAIR_WIDTH : STAIR_LENGTH
  return {x0:stair.x,z0:stair.z,x1:stair.x+w,z1:stair.z+d}
}

export function overlap(a:Rect,b:Rect):Rect|null {
  const r={x0:Math.max(a.x0,b.x0),z0:Math.max(a.z0,b.z0),
    x1:Math.min(a.x1,b.x1),z1:Math.min(a.z1,b.z1)}
  return rectangleArea(r)>0?r:null
}

/** Exact rectangular difference: disjoint rectangles covering base minus cutout. */
export function subtractRect(base:Rect,cutout:Rect):Rect[] {
  const cut=overlap(base,cutout)
  if (!cut)return [base]
  const parts:Rect[]=[
    {x0:base.x0,z0:base.z0,x1:cut.x0,z1:base.z1},
    {x0:cut.x1,z0:base.z0,x1:base.x1,z1:base.z1},
    {x0:cut.x0,z0:base.z0,x1:cut.x1,z1:cut.z0},
    {x0:cut.x0,z0:cut.z1,x1:cut.x1,z1:base.z1},
  ]
  return parts.filter(p=>rectangleArea(p)>0)
}

/** Add an editable copy of the lower footprint; interior elements are not copied. */
export function addFloor(plan:MultiStoreyPlan):MultiStoreyPlan {
  const previous=plan.floors.at(-1)
  if (!previous)throw Error('Для второго этажа сначала нужен первый.')
  const walls=previous.walls.map((w,i)=>({id:`level-${plan.floors.length}-${i}`,a:[...w.a] as Point,b:[...w.b] as Point}))
  return {floors:[...plan.floors,{walls,openings:[],partitions:[],stairToNext:null}]}
}

export function removeTopFloor(plan:MultiStoreyPlan):MultiStoreyPlan {
  if(plan.floors.length<2)throw Error('Нельзя удалить первый этаж.')
  return {floors:plan.floors.slice(0,-1).map((f,i,all)=>
    i===all.length-1 ? {...f,stairToNext:null} : f)}
}

/** Every exposed part of a lower slab is covered; the highest level gets a full roof. */
export function roofs(plan:MultiStoreyPlan):RoofSection[] {
  const output:RoofSection[]=[]
  plan.floors.forEach((floor,index)=>{
    const r=footprint(floor)
    if(!r)return
    const next=plan.floors[index+1],above=next&&footprint(next)
    const parts=above?subtractRect(r,above):[r]
    for(const p of parts)output.push({...p,floor:index,y:(index+1)*STOREY_HEIGHT,
      kind:above?'setback':'top'})
  })
  return output
}

function axisPoints(a:number,b:number):number[] {
  const segments=Math.max(1,Math.ceil((b-a)/COLUMN_SPACING))
  return Array.from({length:segments+1},(_,i)=>a+(b-a)*i/segments)
}

/**
 * Automatic supports for overhangs. Grid spacing <= COLUMN_SPACING metres.
 * Each exposed strip is sampled along its edge and across its area; duplicate
 * columns are consolidated by position/vertical span.
 */
export function columns(plan:MultiStoreyPlan):Column[] {
  const output=new Map<string,Column>()
  for(let upperFloor=1;upperFloor<plan.floors.length;upperFloor++){
    const upper=footprint(plan.floors[upperFloor]),below=footprint(plan.floors[upperFloor-1])
    if(!upper||!below)continue
    for(const strip of subtractRect(upper,below)){
      for(const x of axisPoints(strip.x0,strip.x1))for(const z of axisPoints(strip.z0,strip.z1)){
        if(includes(below,x,z))continue
        let groundedOn=-1
        for(let lower=upperFloor-2;lower>=0;lower--){
          const r=footprint(plan.floors[lower])
          if(r&&includes(r,x,z)){groundedOn=lower;break}
        }
        const fromY=(groundedOn+1)*STOREY_HEIGHT,toY=upperFloor*STOREY_HEIGHT
        if(toY-fromY<.001)continue
        const key=[x.toFixed(4),z.toFixed(4),upperFloor,groundedOn].join(':')
        output.set(key,{x,z,upperFloor,groundedOn,fromY,toY})
      }
    }
  }
  return [...output.values()]
}

function insideRect(r:Rect,s:Rect) {
  return includes(r,s.x0,s.z0)&&includes(r,s.x1,s.z1)
}
function intersectsStairInterior(w:Wall,s:Rect):boolean {
  if(w.a[0]===w.b[0])return w.a[0]>s.x0&&w.a[0]<s.x1&&
    Math.min(w.a[1],w.b[1])<s.z1&&Math.max(w.a[1],w.b[1])>s.z0
  return w.a[1]>s.z0&&w.a[1]<s.z1&&
    Math.min(w.a[0],w.b[0])<s.x1&&Math.max(w.a[0],w.b[0])>s.x0
}
function partitionInside(rect:Rect,w:Wall) {
  return validPoint(w.a)&&validPoint(w.b)&&isAxis(w)&&
    includes(rect,...w.a)&&includes(rect,...w.b)&&
    !([rect.x0,rect.x1].includes(w.a[0])&&w.a[0]===w.b[0])&&
    !([rect.z0,rect.z1].includes(w.a[1])&&w.a[1]===w.b[1])
}
function partitionsOverlap(a:Wall,b:Wall) {
  if(a.a[0]===a.b[0]&&b.a[0]===b.b[0]&&a.a[0]===b.a[0])
    return Math.max(Math.min(a.a[1],a.b[1]),Math.min(b.a[1],b.b[1])) <
      Math.min(Math.max(a.a[1],a.b[1]),Math.max(b.a[1],b.b[1]))
  if(a.a[1]===a.b[1]&&b.a[1]===b.b[1]&&a.a[1]===b.a[1])
    return Math.max(Math.min(a.a[0],a.b[0]),Math.min(b.a[0],b.b[0])) <
      Math.min(Math.max(a.a[0],a.b[0]),Math.max(b.a[0],b.b[0]))
  return false
}

export interface BuildingIssue {floor:number;kind:'footprint'|'partition'|'opening'|'stairs'|'support';message:string}
/** Architectural validation of the entire draft; no fixed ceiling on level count. */
export function validate(plan:MultiStoreyPlan):BuildingIssue[] {
  const issues:BuildingIssue[]=[]
  if(!plan.floors.length)return [{floor:0,kind:'footprint',message:'Построй первый этаж.'}]
  const rects=plan.floors.map(footprint)
  for(let i=0;i<plan.floors.length;i++){
    const floor=plan.floors[i],r=rects[i]
    if(!r){issues.push({floor:i,kind:'footprint',message:'Замкни четыре наружные стены прямоугольника.'});continue}
    const ids=new Set(floor.walls.map(w=>w.id))
    for(const [index,w] of floor.partitions.entries()){
      if(!partitionInside(r,w)||!w.id||ids.has(w.id)||floor.partitions.slice(0,index).some(p=>p.id===w.id||partitionsOverlap(p,w)))
        issues.push({floor:i,kind:'partition',message:'Исправь пересечение или расположение внутренней перегородки.'})
      ids.add(w.id)
    }
    const allWalls=[...floor.walls,...floor.partitions]
    const used=new Set<string>()
    for(const opening of floor.openings){
      const wall=allWalls.find(w=>w.id===opening.wallId)
      const key=`${opening.wallId}:${opening.offset}`
      if(!wall||!['door','window'].includes(opening.kind)||
        !Number.isInteger(opening.offset-.5)||opening.offset<.5||opening.offset>=wallLength(wall)||
        used.has(key)){
        issues.push({floor:i,kind:'opening',message:'Дверь или окно должны занимать свободный метровый участок существующей стены.'})
      }
      used.add(key)
    }
    // Stairs may cross neither partitions of the lower nor of the upper level.
    if(i<plan.floors.length-1){
      const upper=rects[i+1],stair=floor.stairToNext
      if(!upper||!overlap(r,upper))
        issues.push({floor:i+1,kind:'support',message:'Верхний этаж должен пересекаться с нижним для лестничного прохода.'})
      if(!stair||!integer(stair.x)||!integer(stair.z)||
         !['north','south','east','west'].includes(stair.facing)||
         !upper||!insideRect(r,stairRect(stair))||!insideRect(upper,stairRect(stair))||
         floor.partitions.some(w=>intersectsStairInterior(w,stairRect(stair)))||
         plan.floors[i+1].partitions.some(w=>intersectsStairInterior(w,stairRect(stair)))){
        issues.push({floor:i,kind:'stairs',message:`Лестница между этажами ${i+1} и ${i+2} должна быть внутри обоих планов (2 × 3 м) и не пересекать перегородки.`})
      }
    }else if(floor.stairToNext!==null){
      issues.push({floor:i,kind:'stairs',message:'На последнем этаже лестница вверх не нужна.'})
    }
  }
  return issues
}

export function estimate(plan:MultiStoreyPlan):Estimate {
  let outerWalls=0,partitions=0,openings=0,slabs=0,stairs=0
  for(const floor of plan.floors){
    outerWalls+=floor.walls.reduce((v,w)=>v+wallLength(w),0)*BUILD_PRICES.wallPerMetre
    partitions+=floor.partitions.reduce((v,w)=>v+wallLength(w),0)*BUILD_PRICES.partitionPerMetre
    openings+=floor.openings.reduce((v,o)=>v+BUILD_PRICES[o.kind],0)
    slabs+=rectangleArea(footprint(floor)??{x0:0,z0:0,x1:0,z1:0})*BUILD_PRICES.slabPerSquareMetre
    if(floor.stairToNext)stairs+=BUILD_PRICES.stair
  }
  const columnCost=columns(plan).reduce((v,c)=>v+(c.toY-c.fromY)*BUILD_PRICES.columnPerMetre,0)
  const roofCost=roofs(plan).reduce((v,r)=>v+rectangleArea(r)*BUILD_PRICES.roofPerSquareMetre,0)
  return {outerWalls,partitions,openings,slabs,stairs,columns:columnCost,roofs:roofCost,
    total:outerWalls+partitions+openings+slabs+stairs+columnCost+roofCost}
}

export function totalArea(plan:MultiStoreyPlan):number {
  return plan.floors.reduce((v,f)=>v+rectangleArea(footprint(f)??{x0:0,z0:0,x1:0,z1:0}),0)
}

/** A convenience constructor when migrating legacy one-storey BuildingModel. */
export function fromLegacy(model:{walls:Wall[];openings:Opening[]}):MultiStoreyPlan {
  return {floors:[{walls:structuredClone(model.walls),openings:structuredClone(model.openings),
    partitions:[],stairToNext:null}]}
}

/** Convert to a legacy model only if no multi-storey-only features exist. */
export function toLegacy(plan:MultiStoreyPlan):{walls:Wall[];openings:Opening[]}|null {
  if(plan.floors.length!==1||plan.floors[0].partitions.length||plan.floors[0].stairToNext!==null)return null
  return {walls:structuredClone(plan.floors[0].walls),openings:structuredClone(plan.floors[0].openings)}
}
