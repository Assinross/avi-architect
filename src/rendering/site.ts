import * as T from 'three'
import {Artist, custom, random, shade, type Palette} from './art'
import {terrain} from './land'
import {type Point2, type SiteAccess} from '../site-access'

function distanceToSegment(p:Point2,a:Point2,b:Point2){
  const vx=b.x-a.x,vz=b.z-a.z,den=vx*vx+vz*vz
  const t=den?Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.z-a.z)*vz)/den)):0
  return Math.hypot(p.x-a.x-vx*t,p.z-a.z-vz*t)
}

/** A single, continuous low-poly strip following the ground (no gaps at bends). */
function ribbon(group:T.Group,points:readonly Point2[],width:number,elevation:number,color:number){
  const samples:Point2[]=[]
  for(let i=0;i<points.length-1;i++){
    const from=points[i],to=points[i+1],length=Math.hypot(to.x-from.x,to.z-from.z)
    const n=Math.max(1,Math.ceil(length/.34))
    for(let j=0;j<n;j++)samples.push({
      x:from.x+(to.x-from.x)*j/n,z:from.z+(to.z-from.z)*j/n,
    })
  }
  samples.push({...points[points.length-1]})
  const vertices:number[]=[],colors:number[]=[],indices:number[]=[]
  const tint=new T.Color(color)
  for(let i=0;i<samples.length;i++){
    const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)]
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1
    const nx=-dz/len,nz=dx/len
    for(const s of [-1,1]){
      const x=samples[i].x+s*width/2*nx,z=samples[i].z+s*width/2*nz
      vertices.push(x,terrain(x,z)+elevation,z)
      colors.push(tint.r,tint.g,tint.b)
    }
    if(i){
      const n=i*2
      indices.push(n-2,n-1,n,n-1,n+1,n)
    }
  }
  const mesh=custom(group,vertices,indices,colors)
  mesh.castShadow=false
  mesh.name='path-surface'
}

function parcelDecoration(a:Artist,access:SiteAccess,p:Palette){
  const rect=access.parcel
  const cx=(rect.x0+rect.x1)/2,cz=(rect.z0+rect.z1)/2
  const w=rect.x1-rect.x0,d=rect.z1-rect.z0
  // An even, slightly raised, small lawn makes a built lot visually distinct
  // from untended meadow. House geometry and building footprint are unchanged.
  a.put('box',cx,.006,cz,w,.098,d,shade(p.grass,.11))
  const border=shade(p.stone,-.06),wood=shade(p.wood,.12)
  // Low curbing / flowerbed borders, with the public-facing side kept open.
  a.put('box',cx,.072,rect.z0,w,.14,.16,border)
  for(const x of [rect.x0,rect.x1])
    a.put('box',x,.071,cz,.16,.14,d,border)
  for(const x of [rect.x0,rect.x1]){
    for(const z of [rect.z0,rect.z1])
      a.put('stone',x,.105,z,.30,.20,.30,p.stone)
  }
  // Neat hedges, little stones and flowering plants make this an inhabited
  // garden, but stay away from the building facade and pedestrian connector.
  const rng=random(access.site==='home'?711:access.site==='bakery'?913:1127)
  const positions:Point2[]=[]
  for(let i=0;i<12;i++){
    const t=(i+.5)/12
    positions.push({x:rect.x0+.28+t*(w-.56),z:rect.z0+.38})
    if(i%2===0){
      positions.push({x:rect.x0+.39,z:rect.z0+.42+t*(d-.8)})
      positions.push({x:rect.x1-.39,z:rect.z0+.42+t*(d-.8)})
    }
  }
  for(const pos of positions){
    const nearBuilding=pos.x>access.footprint.x0-.20&&pos.x<access.footprint.x1+.20 &&
      pos.z>access.footprint.z0-.20&&pos.z<access.footprint.z1+.20
    const nearPath=access.route.some((point,i)=>i>0&&distanceToSegment(pos,access.route[i-1],point)<.72)
    if(nearBuilding||nearPath)continue
    const flower=[0xf5d9a5,0xeac1b4,0xd9e5b9,0xdfbb81][Math.floor(rng()*4)]
    a.put('bush',pos.x,.25,pos.z,.34+rng()*.10,.24+rng()*.11,.31,p.leaf)
    a.put('canopy',pos.x+(rng()-.5)*.15,.43,pos.z,.075,.07,.075,flower)
    if(rng()<.35)a.put('stone',pos.x+.35,.10,pos.z,.22,.12,.24,shade(p.stone,.08))
  }
  // Garden lamps, set away from the path and without blocking the approach.
  for(const x of [rect.x0+.42,rect.x1-.42]){
    const z=rect.z1-.48,point={x,z}
    if(access.route.some((b,i)=>i>0&&distanceToSegment(point,access.route[i-1],b)<.67))continue
    a.put('cylinder',x,.33,z,.065,.60,.065,wood)
    a.put('box',x,.66,z,.18,.21,.18,0xf1ddae)
    a.put('box',x,.79,z,.28,.07,.28,shade(p.roof,-.05))
  }
}

/** Completed buildings gain a prepared plot and a permanent private branch
 * connecting the real town footpath to the exterior door. */
export function renderSite(access:SiteAccess,p:Palette):T.Group{
  const a=new Artist()
  parcelDecoration(a,access,p)
  // Visible stone borders with a narrow, pale pedestrian paving strip.
  ribbon(a.group,access.route,.95,.079,shade(p.wood,.20))
  ribbon(a.group,access.route,.74,.092,shade(p.stone,.19))
  // Subtle individual paving stones: few geometries thanks to instancing.
  const rng=random(access.site==='home'?330:access.site==='bakery'?520:910)
  for(let i=0;i<access.route.length-1;i++){
    const from=access.route[i],to=access.route[i+1]
    const len=Math.hypot(to.x-from.x,to.z-from.z)
    const count=Math.floor(len/.48)
    if(count<1)continue
    const vx=(to.x-from.x)/len,vz=(to.z-from.z)/len
    for(let j=0;j<count;j++){
      const t=(j+.5)/count,dx=(rng()-.5)*.10
      const x=from.x+(to.x-from.x)*t-vz*dx,z=from.z+(to.z-from.z)*t+vx*dx
      a.put('box',x,terrain(x,z)+.112,z,.25+rng()*.06,.024,.32+rng()*.08,
        shade(p.stone,(rng()-.46)*.12),0,Math.atan2(-vx,vz))
    }
  }
  const group=a.finish()
  group.name='building-site-'+access.site
  group.userData.site=access.site
  group.userData.connectedToTrail=true
  group.userData.route=access.route.map(point=>({...point}))
  group.userData.parcel={...access.parcel}
  group.userData.door={...access.door}
  return group
}
