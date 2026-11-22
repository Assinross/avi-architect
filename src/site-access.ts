import {plot, type Wall, type Opening} from './model'

/** All city coordinates are in the same world space as the original public footpath. */
export interface Point2 {x:number;z:number}
export interface SiteRect {x0:number;z0:number;x1:number;z1:number}
export type SiteId = 'home'|'bakery'|'landmark'
export const SITE_METRE=.65

export const siteCenters:Record<SiteId,Point2>={
  home:{x:-10.3,z:-4.2},
  bakery:{x:15.4,z:1.2},
  landmark:{x:-22,z:-8},
}

/** Shared with landscape(): do not independently copy or approximate the public trail. */
export const publicTrail:readonly Point2[]=[
  {x:-31,z:-5},{x:-16,z:-1.2},{x:-8,z:.4},{x:-2,z:2.7},
  {x:3.3,z:2.1},{x:8,z:2.7},{x:15,z:5.3},
  {x:26,z:5.6},{x:38,z:8.3},
]

export interface GroundPlan {
  walls:readonly Wall[]
  openings:readonly Opening[]
}

export interface SiteAccess {
  site:SiteId
  /** Visible entrance location, exactly on its exterior wall. */
  door:Point2
  /** The NPC's approach point, 0.72 model metres outside the wall. */
  approach:Point2
  /** Final paving point, just outside the doorstep. */
  threshold:Point2
  /** The junction lies exactly on one of the rendered public-path segments. */
  junction:Point2
  /** From the public trail, around the house when required, to the doorstep. */
  route:Point2[]
  /** A grassy private parcel (the shape of the house is never modified). */
  parcel:SiteRect
  footprint:SiteRect
}

const dist=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z)
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
const translate=(p:Point2,n:Point2,d:number):Point2=>({x:p.x+n.x*d,z:p.z+n.z*d})

/** Exact closest point on the polyline used for the existing town path. */
export function nearestPublicTrail(point:Point2):Point2 {
  let nearest=publicTrail[0],best=Infinity
  for(let i=0;i<publicTrail.length-1;i++){
    const a=publicTrail[i],b=publicTrail[i+1]
    const dx=b.x-a.x,dz=b.z-a.z
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz)))
    const p={x:a.x+dx*t,z:a.z+dz*t},d=dist(point,p)
    if(d<best){best=d;nearest=p}
  }
  return {...nearest}
}
function bbox(walls:readonly Wall[],origin:Point2):SiteRect|null {
  if(!walls.length)return null
  const points=walls.flatMap(w=>[w.a,w.b])
  const xs=points.map(p=>origin.x+p[0]*SITE_METRE)
  const zs=points.map(p=>origin.z+p[1]*SITE_METRE)
  if(!xs.every(Number.isFinite)||!zs.every(Number.isFinite))return null
  return {x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)}
}
function deduplicate(points:Point2[]):Point2[]{
  const out:Point2[]=[]
  for(const p of points)if(!out.length||dist(p,out[out.length-1])>.015)out.push(p)
  return out
}

/**
 * Branch from the real public path to the door for any one of the four
 * exterior walls. For rear entrances, route around an exterior corner
 * rather than drawing a shortcut through the house. Nothing is stored in
 * the save file: the path follows the latest published doorway automatically.
 */
export function planSiteAccess(site:SiteId,ground:GroundPlan):SiteAccess|null {
  const wall=ground.walls.find(w=>ground.openings.some(o=>o.wallId===w.id&&o.kind==='door'))
  const opening=ground.openings.find(o=>o.wallId===wall?.id&&o.kind==='door')
  if(!wall||!opening)return null
  const siteCenter=siteCenters[site]
  const origin={x:siteCenter.x-plot.width*SITE_METRE/2,
    z:siteCenter.z-plot.depth*SITE_METRE/2}
  const foot=bbox(ground.walls,origin)
  if(!foot)return null
  const wallSize=Math.abs(wall.b[0]-wall.a[0])+Math.abs(wall.b[1]-wall.a[1])
  if(!wallSize||opening.offset<0||opening.offset>wallSize)return null
  const t=opening.offset/wallSize
  const door={x:origin.x+lerp(wall.a[0],wall.b[0],t)*SITE_METRE,
    z:origin.z+lerp(wall.a[1],wall.b[1],t)*SITE_METRE}
  const vertical=wall.a[0]===wall.b[0]
  const normal:Point2=vertical?
    {x:Math.abs(door.x-foot.x0)<.001?-1:1,z:0}:
    {x:0,z:Math.abs(door.z-foot.z0)<.001?-1:1}
  const approach=translate(door,normal,.72*SITE_METRE)
  const threshold=translate(door,normal,.23*SITE_METRE)
  const parcel:SiteRect={
    x0:Math.min(siteCenter.x-plot.width*SITE_METRE/2-.28,foot.x0-.82),
    x1:Math.max(siteCenter.x+plot.width*SITE_METRE/2+.28,foot.x1+.82),
    z0:Math.min(siteCenter.z-plot.depth*SITE_METRE/2-.18,foot.z0-.82),
    z1:Math.max(siteCenter.z+plot.depth*SITE_METRE/2+.18,foot.z1+.82),
  }
  const frontZ=parcel.z1+.22
  let route:Point2[]
  if(normal.z===1){
    const gate={x:door.x,z:frontZ}
    route=[nearestPublicTrail(gate),gate,approach,threshold]
  }else{
    // Going along a building side is safe for side and rear entrances.
    const sides=[foot.x0-.68,foot.x1+.68]
    const candidates=sides.map(x=>{
      const gate={x,z:frontZ}
      const junction=nearestPublicTrail(gate)
      const trail=[junction,gate,{x,z:normal.z===-1?foot.z0-.68:approach.z}]
      if(normal.z===-1)trail.push({x:door.x,z:foot.z0-.68})
      trail.push(approach,threshold)
      const reduced=deduplicate(trail)
      return {points:reduced,distance:reduced.slice(1).reduce((sum,p,i)=>sum+dist(reduced[i],p),0)}
    })
    route=candidates.sort((a,b)=>a.distance-b.distance)[0].points
    // A side entrance goes around the SAME side as its door.
    if(normal.x){
      const x=normal.x<0?sides[0]:sides[1]
      const gate={x,z:frontZ}
      route=deduplicate([nearestPublicTrail(gate),gate,{x,z:approach.z},approach,threshold])
    }
  }
  return {site,door,approach,threshold,junction:route[0],route,parcel,footprint:foot}
}
