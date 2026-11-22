import * as T from 'three'
import {Artist,custom,random,shade,vec,type Palette} from './art'
import {townHall,bench,fountain} from './town'

export const lots={home:{x:-10.3,z:-4.2},bakery:{x:15.4,z:1.2}}
export const landmarkLot={x:-22,z:-8}
export const unit=.65
const river=(x:number)=>8.4+Math.sin(x*.117)*1.37+x*.112
const channel=(x:number,z:number)=>Math.abs(z-river(x))
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v))
function terrain(x:number,z:number){
  const bank=clamp((channel(x,z)-1.82)/1.08)
  const distant=clamp((Math.max(Math.abs(x)-19,-z-10,z-18))/12)
  return (bank-1)*1.85+bank*distant*(1.5+Math.cos(x*.17)*.73+Math.sin(z*.27)*.8)+.018*Math.sin(x*.7)*Math.sin(z)
}
function path(a:Artist,points:number[][],w:number,color:number,detail:boolean) {
  const geo:number[]=[],inds:number[]=[],cols:number[]=[],rng=random(723)
  for(let i=0;i<points.length;i++){
    const [x,z]=points[i],prev=points[Math.max(i-1,0)],next=points[Math.min(i+1,points.length-1)]
    const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)
    for(const s of [-1,1]){
      const px=x+s*dz/len*w*.5,pz=z-s*dx/len*w*.5
      geo.push(px,terrain(px,pz)+.055,pz);cols.push(...new T.Color(color).toArray())
    }
    if(i){const v=i*2;inds.push(v-2,v-1,v,v,v-1,v+1)}
    if(i&&detail){
      const [x0,z0]=prev,dist=Math.hypot(x-x0,z-z0)
      for(let j=0;j<Math.floor(dist*w*5);j++){
        const t=rng(),s=(rng()-.5)*w*.94,px=x0+(x-x0)*t+s*(z-z0)/dist,pz=z0+(z-z0)*t-s*(x-x0)/dist
        a.put('stone',px,terrain(px,pz)+.058,pz,.12+rng()*.14,.023,.07+rng()*.08,shade(color,(rng()-.6)*.17),0,rng()*Math.PI)
      }
    }
  }
  custom(a.group,geo,inds,cols)
}
function bridge(a:Artist,p:Palette){
  const x=2.1,z=river(x),l=6.7,w=2.30, rng=random(88)
  const rise=(u:number)=>.21+Math.cos(u/l*Math.PI)*.77
  const arc=(u:number)=>-.92+Math.sqrt(Math.max(0,1-(u/2.5)**2))*1.52
  for(let j=0;j<27;j++){
    const u=(j+.5)*l/27-l/2,y=rise(u)
    a.put('box',x,y,z+u,w+.19,.16,l/27+.035,shade(p.stone,(rng()-.5)*.09),.77*Math.PI/l*Math.sin(u/l*Math.PI))
    for(const s of [-1,1]){
      const px=x+s*(w/2-.05), bottom=arc(u)
      a.put('box',px,(bottom+y)/2,z+u,.43,y-bottom,l/27+.024,shade(p.stone,(rng()-.5)*.13))
      if(j%2===0){
        a.put('box',px,y+.33,z+u,.37,.62,.49,shade(p.stone,(rng()-.5)*.10))
        a.put('box',px,y+.68,z+u,.47,.12,.52,shade(p.stone,.07))
      }
      if(Math.abs(u)<2.46)a.put('box',px+s*.045,bottom+.09,z+u,.51,.23,.28,shade(p.stone,.085),Math.atan2(u,2.8))
    }
  }
}
function tree(a:Artist,x:number,z:number,size:number,p:Palette,rng:()=>number,pine:boolean){
  const y=terrain(x,z),color=rng()<.5?p.leaf:p.pale
  const height=size*(pine?1.5:1.03)
  a.put('cylinder',x,y+height*.34,z,.11*size,height*.67,.13*size,shade(p.wood,-.04),0,rng(),.025)
  if(pine){
    for(let j=0;j<4;j++){
      const w=size*(.33-j*.052)
      a.put('cone',x,y+height*(.39+j*.145),z,w,height*(.48-j*.042),w,shade(p.leaf,-.072+j*.026+(rng()-.5)*.045),0,rng()*.8)
    }
  }else{
    const count=7
    for(let j=0;j<count;j++){
      const ang=j/count*Math.PI*2+rng()*.25,rad=j===0?.02:(.13+rng()*.09)
      const px=x+Math.cos(ang)*rad*size,pz=z+Math.sin(ang)*rad*size
      const py=y+size*(j===0?.90:.61+rng()*.20),w=size*(.22+rng()*.095)
      if(j===2||j===5)a.beam(vec(x,y+size*.30,z),vec(px,py,pz),size*.057,p.wood)
      a.put('bush',px,py,pz,w,w*(.89+rng()*.37),w,shade(color,(rng()-.57)*.13),rng()*.6,rng()*3)
    }
  }
}
function hills(a:Artist,p:Palette) {
  const colors=[0xa3b2a5,shade(p.hill,.045),p.hill,shade(p.hill,-.025)]
  for(let k=0;k<4;k++){
    const pos:number[]=[],ind:number[]=[],col:number[]=[],rng=random(630+k)
    for(let i=0;i<=96;i++){
      const x=(i-48)*3.5, peak=Math.abs(Math.sin(x*.076+k*2))+Math.abs(Math.cos(x*.042+.8*k))*.8
      const h=3+(3-k)*2.4+peak*(3.2-k*.26)+rng()*1.4,z=-84+k*14
      for(let j=0;j<5;j++){
        const f=j/4,px=x+(rng()-.5)*1.2,pz=z+f*15+(rng()-.5)*.85
        pos.push(px,h*(1-f**1.45)-2*f,pz)
        const c=new T.Color(shade(colors[k],(rng()-.5)*.042+f*.018));col.push(c.r,c.g,c.b)
        if(i&&j){const v=i*5+j;ind.push(v-6,v-5,v,v-6,v,v-1)}
      }
    }
    const mesh=custom(a.group,pos,ind,col);mesh.castShadow=false
  }
}
export function landscape(p:Palette,theme:number) {
  const a=new Artist(),rng=random(75361)
  const geom:number[]=[],indices:number[]=[],cols:number[]=[]
  const nx=160,nz=125
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const x=(i-nx/2)*.78,z=(j-79)*.78,y=terrain(x,z),d=channel(x,z)
    const noise=.024*Math.sin(x*.36+z*.2)+.015*Math.cos(z*.78)+.025*(rng()-.5)
    const c=new T.Color(shade(d<2.6?0xadac81:p.grass,noise))
    geom.push(x,y,z);cols.push(c.r,c.g,c.b)
    if(i&&j){const n=j*(nx+1)+i;indices.push(n-nx-2,n-1,n,n-nx-2,n,n-nx-1)}
  }
  custom(a.group,geom,indices,cols,false)
  hills(a,p)
  const waterPoints:number[]=[],waterIndices:number[]=[],waterColors:number[]=[]
  for(let i=0;i<=150;i++){
    const x=(i-75)*.84,m=river(x)
    for(let j=0;j<6;j++){
      waterPoints.push(x,-.48,m+(j-2.5)*1.42)
      waterColors.push(...new T.Color(shade(p.river,(Math.abs(j-2.5)-1)*.023+.020*Math.sin(x*.73+j))).toArray())
      if(i&&j){const n=i*6+j;waterIndices.push(n-7,n-6,n,n-7,n,n-1)}
    }
  }
  const water=custom(a.group,waterPoints,waterIndices,waterColors);water.castShadow=false
  for(let i=0;i<390;i++){
    const x=(rng()-.5)*96,z=river(x)+(rng()-.5)*4.4
    a.put('box',x,-.46,z,.12+rng()*.83,.011,.027+rng()*.04,shade(p.river,.045+rng()*.15),0,(rng()-.7)*.18)
  }
  const road=0xc7b797
  path(a,[[-31,-5],[-16,-1.2],[-8,.4],[-2,2.7],[3.3,2.1],[8,2.7],[15,5.3],[26,5.6],[38,8.3]],1.67,road,true)
  path(a,[[2.1,river(2.1)-3.27],[2.1,5.1],[1.6,3.6],[.3,2.4]],2.14,road,true)
  path(a,[[2.1,river(2.1)+3.27],[1.7,14.3],[-1.4,16.6],[-6.2,19.4],[-10,25],[-12,31]],2.16,road,true)
  path(a,[[5.7,2.8],[6.22,1.1],[6.22,-.1]],1.75,road,true)
  path(a,[[-22.3,-3.3],[-22.1,-4.1],[-22,-4.85]],1.15,road,true)
  a.put('cylinder',-.4,.045,.98,6.7,.095,5.77,road)
  for(let i=0;i<570;i++){
    const x=(rng()-.5)*6.5-.4,z=(rng()-.5)*5.3+.98
    if(((x+.4)/3.2)**2+((z-.98)/2.58)**2>1)continue
    a.put('box',x,.105,z,.18+rng()*.22,.032,.1+rng()*.12,shade(road,(rng()-.57)*.15),0,rng()*.24)
  }
  bridge(a,p);townHall(a,p,theme);fountain(a,p);bench(a,-2.7,-.10,-.36,p);bench(a,1.25,-.92,.25,p)
  for(let i=0;i<540;i++){
    const x=(rng()-.5)*108,z=(rng()-.6)*74
    const forest=z<-11||Math.abs(x)>22||z>19
    if(!forest||channel(x,z)<3.3||Math.abs(x+11)<2&&z>20)continue
    if(x>-28&&x<-16&&z>-15&&z<-2)continue // Clear the new architect's site.
    if(z>11&&z<23&&Math.abs(x)<19)continue
    if(z>13&&x>4&&x<23)continue
    tree(a,x,z,2.1+rng()*3.95,p,rng,z<-17?rng()<.64:rng()<.20)
  }
  for(const [x,z,size] of [[-16,1,4.6],[-5,-9.1,4.9],[11,-7.7,5.1],[18,6.7,3.6],[-13,13,4.9],[-18,7,3.8],[-2,-7,4.5],[6,-9.4,5.2],[-22,16,5.1],[-17,17,3.2]])tree(a,x,z,size,p,rng,false)
  for(let i=0;i<950;i++){
    const x=(rng()-.5)*67,z=river(x)+(rng()<.5?-1:1)*(2.27+rng()*.73)
    if(Math.abs(x-2.1)<1.6)continue
    const y=terrain(x,z)
    if(i%9===0)a.put('stone',x,y+.03,z,.15+rng()*.37,.15+rng()*.17,.15+rng()*.31,shade(p.stone,(rng()-.65)*.18),rng(),rng()*3)
    else a.put('cone',x,y+.14,z,.055+rng()*.1,.32+rng()*.43,.055,shade(p.leaf,(rng()-.4)*.13),.13,rng()*3,.11)
  }
  for(let i=0;i<330;i++){
    const x=(rng()-.5)*53,z=(rng()-.48)*34
    if(channel(x,z)<3||Math.abs(x-2)<2||z<5.3&&z>-7&&x>-15&&x<20)continue
    const grass=shade(p.leaf,.08*rng()), blossom=[0xe9dbab,0xb897ae,0xf1d1aa,0xdfb558][i%4]
    for(let j=0;j<9;j++){
      const px=x+(rng()-.5)*1.18,pz=z+(rng()-.5)*.97,y=terrain(px,pz)
      a.put('cone',px,y+.08,pz,.035,.18+rng()*.09,.035,grass,.08)
      if(j%2===0)a.put('canopy',px,y+.19,pz,.065,.055,.062,blossom,.15,rng()*3)
    }
  }
  // Граница луга и деревянный указатель у переправы.
  for(const [start,z,count] of [[-16,3.2,5],[11,-4.8,6],[-13,15.4,4]]){
    for(let i=0;i<count;i++){
      const x=start+i*1.45,y=terrain(x,z)
      a.put('box',x,y+.39,z,.16,.85,.17,p.wood,0,.06,.035)
      if(i<count-1) for(const h of [.28,.58])a.put('box',x+.72,y+h,z,1.46,.095,.09,shade(p.wood,.07))
    }
  }
  a.put('box',3.86,.78,4.77,.16,1.57,.16,p.wood)
  a.put('box',3.69,1.36,4.77,.91,.27,.13,0xa78457,0,.18,-.045)
  return a.finish()
}
