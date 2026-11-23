import { nearestPublicTrail, publicTrail, type Point2, type SiteAccess } from './site-access'

export type WalkerName = 'mayor' | 'resident' | 'baker' | 'nika'

export interface CitizenWalk {
  /** Consecutive points on the public trail and any visible paved branch. */
  points: Point2[]
  /** A private doorstep to pause at, if this resident has a completed home. */
  doorStop: number | null
  /** End of the outbound stroll, where the pedestrian turns around. */
  turnStop: number
}

/** The public path is ordered west to east; interpolate rather than cut across grass. */
function pointOnTrail(x: number): Point2 {
  for (let i = 1; i < publicTrail.length; i++) {
    const a = publicTrail[i-1], b = publicTrail[i]
    if (x <= b.x) {
      const t = Math.max(0, Math.min(1, (x-a.x)/(b.x-a.x)))
      return {x:a.x+(b.x-a.x)*t, z:a.z+(b.z-a.z)*t}
    }
  }
  return {...publicTrail[publicTrail.length-1]}
}

function alongTrail(from: Point2, to: Point2): Point2[] {
  const forward = to.x >= from.x
  const inner = publicTrail.filter(p => forward
    ? p.x > from.x+.001 && p.x < to.x-.001
    : p.x < from.x-.001 && p.x > to.x+.001)
  return [{...from}, ...(forward ? inner : inner.reverse()).map(p=>({...p})), {...to}]
}

/**
 * Every citizen gets a different stretch of the ACTUAL town footpath.
 * House visits use planSiteAccess's rendered private paving; the mayor uses
 * the existing branch from the main path to the town-hall steps.
 * All itineraries return along the trail instead of teleporting across lots.
 */
export function citizenWalk(name: WalkerName, access: SiteAccess | null = null): CitizenWalk {
  const walks: Record<WalkerName, {west:number; east:number; reverse:boolean}> = {
    mayor:    {west:-2.7,east:9.4,reverse:false},
    resident: {west:-18.1,east:-4.2,reverse:true},
    baker:    {west:8.8,east:25.5,reverse:false},
    nika:     {west:-29.5,east:-17.1,reverse:true},
  }
  const area = walks[name]
  const start = pointOnTrail(area.reverse ? area.east : area.west)
  const end = pointOnTrail(area.reverse ? area.west : area.east)
  const hallGate = {x:5.7,z:2.8}
  const privateBranch = name === 'mayor'
    ? [nearestPublicTrail(hallGate), hallGate, {x:6.22,z:1.1}, {x:6.22,z:-.1}]
    : access?.route.slice(0,-1) ?? null // stop on the paving before the door
  const visits = privateBranch && privateBranch.length >= 2 &&
    privateBranch[0].x >= area.west && privateBranch[0].x <= area.east

  let points: Point2[]
  let doorStop: number | null = null
  if (visits && privateBranch) {
    const junction = privateBranch[0]
    points = alongTrail(start,junction)
    points.push(...privateBranch.slice(1).map(p=>({...p})))
    if (name !== 'mayor') doorStop = points.length-1
    // Retrace the same visible branch before continuing along the footpath.
    points.push(...privateBranch.slice(0,-1).reverse().map(p=>({...p})))
    points.push(...alongTrail(junction,end).slice(1))
  } else points=alongTrail(start,end)

  const turnStop=points.length-1
  points.push(...alongTrail(end,start).slice(1))
  return {points, doorStop, turnStop}
}
