import { Artist, vec, type Palette } from './art'
import { bench } from './town'
import type { Riverworks } from '../civic'

export function riverDistrict(plan:Riverworks,p:Palette){
  const a=new Artist(),x=-6
  const heights=[6,...plan.heights,0].map(h=>2.4+h*.01)
  // A spring on the high bank feeds the first section of the channel.
  a.put('stone',x,1.05,2.5,1.8,1.65,1.45,p.stone)
  a.put('cylinder',x,heights[0],2.65,.94,.1,.95,p.river)
  for(let i=0;i<4;i++){
    const z=3+i*3.3
    a.put('box',x,0,z,1,4.4,.55,p.stone)
    if(i===3)break
    const next=heights[i+1]
    for(const dx of [-.4,0,.4]){
      const water=dx===0, lift=water?0:.09
      a.beam(vec(x+dx,heights[i]+lift,z),vec(x+dx,next+lift,z+3.3),water?.72:.14,water?p.river:p.stone,.16)
    }
    for(let j=0;j<11;j++){
      const angle=(j+.5)*Math.PI/11
      a.put('box',x,.8+1.42*Math.sin(angle),z+1.65+1.42*Math.cos(angle),.85,.47,.45,p.stone,-angle,0,0)
    }
  }
  a.put('cylinder',x,.32,13.4,2.2,.62,2.2,p.stone)
  a.put('cylinder',x,.65,13.4,1.88,.06,1.88,p.river)
  a.put('box',x,1.54,13.05,.32,1.78,.24,p.river)
  if(plan.garden){
    a.put('box',x,.13,14.3,5,.18,.42,p.river)
    plan.garden.forEach((plant,i)=>{
      const cx=x+(1-i%3)*1.65,cz=15.2+Math.floor(i/3)*1.65
      a.put('box',cx,.08,cz,1.63,.14,1.63,plant==='path'?0xd9bd90:p.grass)
      if(i===5)bench(a,cx,cz,Math.PI/2,p)
      if(plant==='tree'){
        a.put('cylinder',cx,.95,cz,.27,1.7,.27,p.wood)
        a.put('bush',cx,2,cz,1.04,.98,1.04,p.leaf)
      }
      if(plant==='flowers')for(let j=0;j<9;j++)
        a.put('canopy',cx+(j%3-1)*.42,.28,cz+(Math.floor(j/3)-1)*.42,.16,.21,.16,j%2?0xe8b265:0xcf8190)
    })
  }
  return a.finish()
}
