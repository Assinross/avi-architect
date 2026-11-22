import * as T from 'three'
import { STOREY_HEIGHT, wallLength, footprint, subtractRect, stairRect, columns, roofs,
  type MultiStoreyPlan, type Wall, type Opening, type Rect } from '../multistorey'
import { Artist, roof, shade, type Palette } from './art'

/** Geometry-only renderer: the workshop and town use the same immutable floor plans. */
export function cityLandmark(plan:MultiStoreyPlan,p:Palette,theme:number):T.Group {
  const a=new Artist()
  const putRect=(r:Rect,y:number,h:number,color:number)=>{
    a.put('box',(r.x0+r.x1)/2,y,(r.z0+r.z1)/2,r.x1-r.x0,h,r.z1-r.z0,color)
  }
  function wall(w:Wall,openings:Opening[],level:number,inside:boolean) {
    const len=wallLength(w)
    if(!len)return
    const alongX=w.a[1]===w.b[1]
    const sign=alongX?Math.sign(w.b[0]-w.a[0]):Math.sign(w.b[1]-w.a[1])
    const thickness=inside?.12:.23,wallHeight=inside?2.65:2.91
    const y0=level*STOREY_HEIGHT
    const put=(at:number,y:number,length:number,height:number,color:number,depth=thickness)=>{
      if(length<=0||height<=0)return
      const x=alongX?w.a[0]+sign*at:w.a[0],z=alongX?w.a[1]:w.a[1]+sign*at
      a.put('box',x,y0+y,z,alongX?length:depth,height,alongX?depth:length,color)
    }
    const plaster=inside?shade(p.plaster,-.075):p.plaster
    for(let i=0;i<len;i++){
      const item=openings.find(o=>o.wallId===w.id&&o.offset===i+.5)
      if(!item){put(i+.5,wallHeight/2+.16,1.01,wallHeight,plaster);continue}
      const door=item.kind==='door',bottom=door?.08:1.13,top=door?2.42:2.34
      const gap=door?.76:.72,side=(1-gap)/2
      put(i+.5,bottom/2+.16,1,bottom,plaster)
      put(i+.5,(top+wallHeight)/2+.16,1,wallHeight-top,plaster)
      for(const s of [-1,1])put(i+.5+s*(gap+side)/2,(top+bottom)/2+.16,side+.01,top-bottom,plaster)
      if(door) {
        put(i+.5,(top+bottom)/2+.16,gap-.055,top-bottom-.055,shade(p.wood,.02),thickness+.025)
        put(i+.68,1.24,.065,.07,0xe3c27f,thickness+.12)
      }else{
        put(i+.5,(top+bottom)/2+.16,gap-.02,top-bottom,0xa3c9bd,thickness+.02)
        put(i+.5,(top+bottom)/2+.16,.06,top-bottom+.15,p.wood,thickness+.12)
        put(i+.5,top+.17,gap+.13,.08,p.wood,thickness+.12)
        put(i+.5,bottom+.09,gap+.22,.12,p.stone,thickness+.22)
        if(!inside)put(i+.5,bottom-.11,gap+.24,.18,shade(p.wood,.1),thickness+.32)
      }
    }
    if(!inside)put(len/2,wallHeight+.12,len+.18,.16,p.wood,thickness+.06)
  }
  plan.floors.forEach((floor,index)=>{
    const rect=footprint(floor)
    if(!rect)return
    const incoming=plan.floors[index-1]?.stairToNext
    for(const piece of incoming?subtractRect(rect,stairRect(incoming)):[rect])
      putRect(piece,index*STOREY_HEIGHT+.065,.13,p.stone)
    for(const w of floor.walls)wall(w,floor.openings,index,false)
    for(const w of floor.partitions)wall(w,floor.openings,index,true)
    if(floor.stairToNext&&index<plan.floors.length-1){
      const opening=stairRect(floor.stairToNext)
      const xMid=(opening.x0+opening.x1)/2,zMid=(opening.z0+opening.z1)/2
      const horizontal=floor.stairToNext.facing==='east'||floor.stairToNext.facing==='west'
      const descending=floor.stairToNext.facing==='north'||floor.stairToNext.facing==='west'
      const length=horizontal?opening.x1-opening.x0:opening.z1-opening.z0
      for(let i=0;i<15;i++){
        const ratio=(i+.5)/15
        const travel=descending?length*(1-ratio):length*ratio
        const x=horizontal?opening.x0+travel:xMid,z=horizontal?zMid:opening.z0+travel
        a.put('box',x,index*STOREY_HEIGHT+.22+ratio*(STOREY_HEIGHT-.32),z,
          horizontal?length/15+.02:1.65,.14,horizontal?1.65:length/15+.02,shade(p.wood,.18))
      }
    }
  })
  for(const support of columns(plan)){
    const height=support.toY-support.fromY
    if(height>.001)a.put('box',support.x,support.fromY+height/2,support.z,.26,height,.26,p.stone)
  }
  for(const r of roofs(plan)){
    if(r.kind==='setback')putRect(r,r.y+.025,.19,shade(p.roof,.14))
    else{
      const width=r.x1-r.x0,depth=r.z1-r.z0
      roof(a,(r.x0+r.x1)/2,r.y-.09,(r.z0+r.z1)/2,
        width+.34,depth+.37,Math.max(.60,Math.min(2,depth*.31)),p,109+plan.floors.length,theme<2)
    }
  }
  return a.finish()
}
