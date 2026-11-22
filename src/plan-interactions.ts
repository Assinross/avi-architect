import {
  GRID, footprint, validate, wallLength, type FloorPlan, type Point,
  type Rect, type Wall, type Opening,
} from './multistorey'

/** Pure, undo-friendly operations used by mouse, pen and touch gestures alike. */
const clone=(floor:FloorPlan)=>structuredClone(floor)
const pt=(x:number,z:number):Point=>[x,z]
const insideGrid=(r:Rect)=>r.x0>=0&&r.z0>=0&&r.x1<=GRID.width&&r.z1<=GRID.depth
const valid=(floor:FloorPlan)=>!validate({floors:[{...floor,stairToNext:null}]})
  .some(issue=>issue.kind==='footprint'||issue.kind==='partition'||issue.kind==='opening')

function remapOpenings(oldWalls:Wall[], newWalls:Wall[], originals:Opening[]):Opening[]|null {
  const changed:Opening[]=[]
  for(const wall of [...newWalls]){
    const previous=oldWalls.find(w=>w.id===wall.id)
    const oldLen=previous?wallLength(previous):wallLength(wall)
    const newLen=wallLength(wall)
    const selected=originals.filter(o=>o.wallId===wall.id).sort((a,b)=>a.offset-b.offset)
    if(selected.length>newLen)return null
    const used=new Set<number>()
    for(const opening of selected){
      const desired=oldLen?Math.round((opening.offset-.5)*newLen/oldLen):Math.round(opening.offset-.5)
      const choices=Array.from({length:newLen},(_,i)=>i)
        .filter(i=>!used.has(i))
        .sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired)||a-b)
      const slot=choices[0]
      if(slot===undefined)return null
      used.add(slot)
      changed.push({...opening,offset:slot+.5})
    }
  }
  return [...changed,...originals.filter(o=>!oldWalls.some(w=>w.id===o.wallId))]
}

function transformPerimeter(floor:FloorPlan, bounds:Rect,
  map:(p:Point)=>Point):FloorPlan|null {
  if(!insideGrid(bounds)||bounds.x1-bounds.x0<2||bounds.z1-bounds.z0<2)return null
  const next=clone(floor),prior=next.walls.map(w=>({...w,a:pt(...w.a),b:pt(...w.b)}))
  next.walls=next.walls.map(w=>({...w,a:map(w.a),b:map(w.b)}))
  if(!footprint(next))return null
  next.partitions=next.partitions.map(w=>({...w,a:map(w.a),b:map(w.b)}))
  const openings=remapOpenings(prior,next.walls,next.openings)
  if(!openings)return null
  next.openings=openings
  return valid(next)?next:null
}

/** Move a rectangle edge perpendicular to itself, extending its neighboring walls. */
export function dragExteriorWall(floor:FloorPlan,wallId:string,coordinate:number):FloorPlan|null {
  const r=footprint(floor),wall=floor.walls.find(w=>w.id===wallId)
  if(!r||!wall||!Number.isSafeInteger(coordinate))return null
  const vertical=wall.a[0]===wall.b[0]
  const side=vertical?(wall.a[0]===r.x0?'x0':'x1'):(wall.a[1]===r.z0?'z0':'z1')
  const newRect={...r,[side]:coordinate}
  const transform=(p:Point):Point=>{
    const x=p[0]===r.x0?newRect.x0:p[0]===r.x1?newRect.x1:p[0]
    const z=p[1]===r.z0?newRect.z0:p[1]===r.z1?newRect.z1:p[1]
    return pt(x,z)
  }
  return transformPerimeter(floor,newRect,transform)
}

/** Drag two corners to draw/resize the complete four-wall envelope. */
export function dragFootprint(floor:FloorPlan,from:Point,to:Point):FloorPlan|null {
  const current=footprint(floor)
  if(!current)return null
  const bounds={x0:Math.min(from[0],to[0]),z0:Math.min(from[1],to[1]),
    x1:Math.max(from[0],to[0]),z1:Math.max(from[1],to[1])}
  const convert=(p:Point):Point=>pt(
    Math.round(bounds.x0+(p[0]-current.x0)*(bounds.x1-bounds.x0)/(current.x1-current.x0)),
    Math.round(bounds.z0+(p[1]-current.z0)*(bounds.z1-bounds.z0)/(current.z1-current.z0))
  )
  return transformPerimeter(floor,bounds,convert)
}

/** Moving the entire room also moves all attached interior geometry and its staircase. */
export function dragRoom(floor:FloorPlan,dx:number,dz:number):FloorPlan|null {
  if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dz))return null
  const next=clone(floor)
  const map=(p:Point)=>pt(p[0]+dx,p[1]+dz)
  next.walls=next.walls.map(w=>({...w,a:map(w.a),b:map(w.b)}))
  next.partitions=next.partitions.map(w=>({...w,a:map(w.a),b:map(w.b)}))
  if(next.stairToNext)next.stairToNext={...next.stairToNext,
    x:next.stairToNext.x+dx,z:next.stairToNext.z+dz}
  return valid(next)?next:null
}

/** Translate a complete partition without detaching or stretching its endpoints. */
export function dragPartition(floor:FloorPlan,id:string,dx:number,dz:number):FloorPlan|null {
  if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dz))return null
  const next=clone(floor),index=next.partitions.findIndex(w=>w.id===id)
  if(index<0)return null
  const w=next.partitions[index]
  next.partitions[index]={...w,a:pt(w.a[0]+dx,w.a[1]+dz),b:pt(w.b[0]+dx,w.b[1]+dz)}
  return valid(next)?next:null
}

/** Drag one endpoint of an interior wall to alter its length, maintaining its axis. */
export function dragPartitionEnd(floor:FloorPlan,id:string,end:'a'|'b',where:Point):FloorPlan|null {
  const next=clone(floor),index=next.partitions.findIndex(w=>w.id===id)
  if(index<0)return null
  const w=next.partitions[index]
  const vertical=w.a[0]===w.b[0]
  const endPoint=vertical?pt(w[end][0],where[1]):pt(where[0],w[end][1])
  next.partitions[index]={...w,[end]:endPoint}
  return valid(next)?next:null
}

export function drawPartition(floor:FloorPlan,a:Point,b:Point,id:string):FloorPlan|null {
  const next=clone(floor)
  next.partitions.push({id,a,b})
  return valid(next)?next:null
}

/** Relocate an entire continuous window or door without splitting its glazing. */
export function dragOpeningRun(floor:FloorPlan,wallId:string,offset:number,width:number,
  nextOffset:number):FloorPlan|null {
  const next=clone(floor),wall=[...next.walls,...next.partitions].find(w=>w.id===wallId)
  if(!wall||!Number.isInteger(nextOffset-.5)||width<1)return null
  if(nextOffset<.5||nextOffset+width-1>=wallLength(wall))return null
  const run=next.openings.filter(o=>o.wallId===wallId&&o.offset>=offset&&o.offset<offset+width)
  if(run.length!==width)return null
  const others=next.openings.filter(o=>!run.includes(o))
  const shifted=run.map(o=>({...o,offset:o.offset-offset+nextOffset}))
  if(shifted.some(o=>others.some(t=>t.wallId===o.wallId&&t.offset===o.offset)))return null
  next.openings=[...others,...shifted]
  return valid(next)?next:null
}

export function dragStaircase(floor:FloorPlan,dx:number,dz:number):FloorPlan|null {
  if(!floor.stairToNext||!Number.isSafeInteger(dx)||!Number.isSafeInteger(dz))return null
  const next=clone(floor)
  next.stairToNext={...next.stairToNext!,x:next.stairToNext!.x+dx,z:next.stairToNext!.z+dz}
  const {x0,z0,x1,z1}=footprint(next)??{x0:0,z0:0,x1:0,z1:0}
  const {x,z,kind,facing}=next.stairToNext!
  const horizontal=facing==='east'||facing==='west'
  const sx=kind==='spiral'?1:horizontal?2:1,sz=kind==='spiral'?1:horizontal?1:2
  return x>=x0&&z>=z0&&x+sx<=x1&&z+sz<=z1?next:null
}
