import * as T from 'three'
import { STOREY_HEIGHT, wallLength, footprint, subtractRect, stairRect, columns, roofs, openingRuns, overhangs,
  type MultiStoreyPlan, type Wall, type Opening, type Rect } from '../multistorey'
import { Artist, roof, shade, type Palette } from './art'
import { architecturalDetails, verandaSpan } from './architectural-details'

/** Geometry-only renderer: the workshop and town use the same immutable floor plans. */
export function cityLandmark(plan:MultiStoreyPlan,palette:Palette,theme:number,options:{showRoof?:boolean}={}):T.Group {
  const modern=plan.style==='modern'
  const p:Palette=modern?{...palette,plaster:0xf1eee6,wood:0x795d49,stone:0xbeb9ae,roof:0x445158}:palette
  const a=new Artist()
  const putRect=(r:Rect,y:number,h:number,color:number)=>{
    a.put('box',(r.x0+r.x1)/2,y,(r.z0+r.z1)/2,r.x1-r.x0,h,r.z1-r.z0,color)
  }
  // All storeys share one elevation datum: slab top touches wall bottom and
  // wall top touches the underside of the next slab, without the old 9–13 cm seam.
  const slab=0.18
  function wall(w:Wall,openings:Opening[],level:number,inside:boolean,rect:Rect) {
    // A real masonry envelope on every level, with one glass garden room.
    const len=wallLength(w)
    if(!len)return
    const alongX=w.a[1]===w.b[1]
    const sign=alongX?Math.sign(w.b[0]-w.a[0]):Math.sign(w.b[1]-w.a[1])
    const thickness=inside?.12:.23,wallHeight=STOREY_HEIGHT-slab
    const y0=level*STOREY_HEIGHT
    const put=(at:number,y:number,length:number,height:number,color:number,depth=thickness)=>{
      if(length<=0||height<=0)return
      const x=alongX?w.a[0]+sign*at:w.a[0],z=alongX?w.a[1]:w.a[1]+sign*at
      a.put('box',x,y0+slab+y,z,alongX?length:depth,height,alongX?depth:length,color)
    }
    const plaster=inside?shade(p.plaster,-.075):p.plaster
    // Keep every planned opening on the solid walls. At the glass bay,
    // remove only the masonry cells; never put plaster behind the glazing.
    const gardenFace=modern && level===0 && !inside && alongX && Math.abs(w.a[1]-rect.z1)<.001
    const glass=gardenFace?verandaSpan(rect):null
    const rawRuns=openingRuns(w,openings)
    const splitRuns=glass?rawRuns.flatMap(run=>Array.from(
      {length:run.width},(_,j)=>({...run,offset:run.offset+j,width:1})
    )):rawRuns
    const runs=new Map(splitRuns.map(run=>[run.offset-.5,run]))
    for(let i=0;i<len;i++){
      const x=w.a[0]+sign*(i+.5)
      if(glass && x>glass.x0 && x<glass.x1)continue
      const run=runs.get(i)
      if(!run){put(i+.5,wallHeight/2,1.01,wallHeight,plaster);continue}
      const wide=run.width
      const at=i+wide/2
      const door=run.kind==='door',bottom=door?.08:1.13,top=door?2.42:2.34
      const gap=wide-(door?.22:.24)
      const side=(wide-gap)/2
      put(at,bottom/2,wide,bottom,plaster)
      put(at,(top+wallHeight)/2,wide,wallHeight-top,plaster)
      for(const s of [-1,1])
        put(at+s*(gap+side)/2,(top+bottom)/2,side+.01,top-bottom,plaster)
      if(door){
        // Wide double doors get two leaves; one-cell doors keep one.
        put(at,(top+bottom)/2,gap-.055,top-bottom-.055,shade(p.wood,.02),thickness+.025)
        put(at+.18,1.24-slab,.065,.07,0xe3c27f,thickness+.12)
        if(wide>1)put(at,(top+bottom)/2,.045,top-bottom-.035,p.wood,thickness+.08)
      }else{
        // Unbroken glazing: no brick pier between adjacent window cells.
        put(at,(top+bottom)/2,gap-.02,top-bottom,0xa3c9bd,thickness+.02)
        put(at,(top+bottom)/2,.06,top-bottom+.15,p.wood,thickness+.12)
        put(at,top+.01,gap+.13,.08,p.wood,thickness+.12)
        put(at,bottom+.09,gap+.22,.12,p.stone,thickness+.22)
        if(!inside)put(at,bottom-.11,gap+.24,.18,shade(p.wood,.1),thickness+.32)
      }
      i+=wide-1
    }
    if(!inside)put(len/2,wallHeight-.11,len+.18,.18,p.wood,thickness+.06)
  }
  plan.floors.forEach((floor,index)=>{
    const rect=footprint(floor)
    if(!rect)return
    const incoming=plan.floors[index-1]?.stairToNext
    for(const piece of incoming?subtractRect(rect,stairRect(incoming)):[rect])
      putRect(piece,index*STOREY_HEIGHT+slab/2,slab,p.stone)
    for(const w of floor.walls)wall(w,floor.openings,index,false,rect)
    for(const w of floor.partitions)wall(w,floor.openings,index,true,rect)
    if(floor.stairToNext&&index<plan.floors.length-1){
      const stair=floor.stairToNext,opening=stairRect(stair)
      const xMid=(opening.x0+opening.x1)/2,zMid=(opening.z0+opening.z1)/2
      if(stair.kind==='spiral'){
        const stairColor=shade(p.wood,.18),radius=.30,steps=18
        a.put('cylinder',xMid,index*STOREY_HEIGHT+STOREY_HEIGHT/2,zMid,.11,STOREY_HEIGHT,.11,p.wood)
        for(let i=0;i<steps;i++){
          const angle=i/steps*Math.PI*2
          const t=(i+.5)/steps
          const yy=index*STOREY_HEIGHT+.24+t*(STOREY_HEIGHT-.36)
          a.put('box',xMid+Math.cos(angle)*radius*.55,yy,zMid+Math.sin(angle)*radius*.55,
            .58,.11,.24,stairColor,0,-angle,0)
          // Light wooden railing with balusters along the spiral.
          if(i%2===0)
            a.put('cylinder',xMid+Math.cos(angle)*.43,yy+.35,zMid+Math.sin(angle)*.43,
              .038,.69,.038,p.wood)
        }
      }else{
        const horizontal=stair.facing==='east'||stair.facing==='west'
        const descending=stair.facing==='north'||stair.facing==='west'
        const length=horizontal?opening.x1-opening.x0:opening.z1-opening.z0
        for(let i=0;i<15;i++){
          const ratio=(i+.5)/15
          const travel=descending?length*(1-ratio):length*ratio
          const x=horizontal?opening.x0+travel:xMid,z=horizontal?zMid:opening.z0+travel
          a.put('box',x,index*STOREY_HEIGHT+.22+ratio*(STOREY_HEIGHT-.32),z,
            horizontal?length/15+.02:.86,.14,horizontal?.86:length/15+.02,shade(p.wood,.18))
        }
      }
    }
  })
  // A raised mansard wing is clad in warm wood with a visible soffit and beams.
  // Open space beneath the wing is preserved and physically supported by columns.
  for(const wing of overhangs(plan)){
    const y=wing.upperFloor*STOREY_HEIGHT
    putRect(wing,y-.13,.17,shade(p.wood,.20))
    const mx=(wing.x0+wing.x1)/2,mz=(wing.z0+wing.z1)/2
    const width=wing.x1-wing.x0,depth=wing.z1-wing.z0
    for(const edgeZ of [wing.z0,wing.z1])
      a.put('box',mx,y-.29,edgeZ,width,.25,.18,p.wood)
    for(const edgeX of [wing.x0,wing.x1])
      a.put('box',edgeX,y-.29,mz,.18,.25,depth,p.wood)
    // Mansard facade accents: evenly-spaced wooden beams visible on the exterior.
    for(let x=wing.x0;x<=wing.x1;x+=Math.min(2,width))
      a.put('box',x,y+.62,wing.z1,.12,1.05,.13,shade(p.wood,.12))
  }
  for(const support of columns(plan)){
    const height=support.toY-support.fromY
    if(height>.001)a.put('box',support.x,support.fromY+height/2,support.z,.26,height,.26,p.stone)
  }
  for(const r of options.showRoof===false?[]:roofs(plan)){
    if(r.kind==='setback')putRect(r,r.y+.025,.19,shade(p.roof,.14))
    else{
      const width=r.x1-r.x0,depth=r.z1-r.z0
      roof(a,(r.x0+r.x1)/2,r.y-.09,(r.z0+r.z1)/2,
        width+.34,depth+.37,Math.max(.60,Math.min(2,depth*.31)),p,109+plan.floors.length,!modern&&theme<2)
    }
  }
  const decoration=architecturalDetails(a,plan,p,modern,options.showRoof!==false)
  const building=a.finish()
  for(const pane of decoration.glazing)building.add(pane)
  building.userData.glass=decoration.glazing
  building.userData.architecturalStyle=modern?'modern':'classic'
  building.userData.decorativeParts=decoration.detailCount
  const ground=plan.floors[0]&&footprint(plan.floors[0])
  const span=modern&&ground?verandaSpan(ground):null
  building.userData.verandaGlassWidth=span?span.x1-span.x0:0
  building.userData.groundWallPerimeter=ground?2*((ground.x1-ground.x0)+(ground.z1-ground.z0)):0
  // Expose explicit elevation intervals for deterministic seam regression tests.
  building.userData.floorSlabThickness=slab
  building.userData.wallBottom=slab
  building.userData.wallTop=STOREY_HEIGHT
  building.userData.openingGroups=plan.floors.reduce((count,floor)=>count+[...floor.walls,...floor.partitions].reduce((n,w)=>n+openingRuns(w,floor.openings).length,0),0)
  building.userData.overhangSections=overhangs(plan).length
  building.userData.spiralStairs=plan.floors.filter(f=>f.stairToNext?.kind==='spiral').length
  return building
}
