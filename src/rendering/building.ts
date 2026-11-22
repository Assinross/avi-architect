import * as T from 'three'
import {area, plot, wallLength, type BuildingModel} from '../model'
import {Artist,random,roof,shade,vec,type Palette} from './art'

export function house(model:BuildingModel,p:Palette,showRoof:boolean,theme:number) {
  const a=new Artist(),rng=random(model.seed), points=model.walls.flatMap(w=>[w.a,w.b])
  const xs=points.map(v=>v[0]),zs=points.map(v=>v[1])
  const xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(...zs),zmax=Math.max(...zs)
  const closed=area(model)>0, isBakery=model.purpose==='bakery'
  const glow:T.Mesh[]=[]
  for(const wall of model.walls){
    const len=wallLength(wall),dx=(wall.b[0]-wall.a[0])/len,dz=(wall.b[1]-wall.a[1])/len
    const nx=dz===0?0:(wall.a[0]<=xmin?-1:1),nz=dx===0?0:(wall.a[1]<=zmin?-1:1)
    const place=(t:number,h:number,n:number,width:number,height:number,depth:number,color:number)=>{
      a.put('box',wall.a[0]+dx*t+nx*n,h,wall.a[1]+dz*t+nz*n,dx?width:depth,height,dx?depth:width,color)
    }
    for(let i=0;i<len;i++){
      const t=i+.5,opening=model.openings.find(o=>o.wallId===wall.id&&o.offset===t)
      if(opening){
        const door=opening.kind==='door',bottom=door?.085:1.14,top=door?2.32:2.19
        const w=door?.79:.70
        place(t,(3+top)/2,0,1,3-top,.20,p.plaster)
        place(t,bottom/2,0,1,bottom,.20,p.plaster)
        for(const side of [-1,1]){
          place(t+side*(.5-(1-w)*.25),(bottom+top)/2,0,(1-w)/2,top-bottom,.20,p.plaster)
          place(t+side*w*.5,(bottom+top)/2,0,.068,top-bottom+.12,.23,p.wood)
        }
        place(t,top,0,w+.08,.105,.24,p.wood)
        if(door) {
          place(t,(top+bottom)/2,0,w-.04,top-bottom-.04,.11,rng()<.5?0x586b58:0x926c48)
          for(let j=1;j<5;j++)place(t-w/2+j*w/5,(top+bottom)/2,.062,.014,top-bottom-.13,.015,p.wood)
          place(t+.23,1.09,.088,.075,.07,.06,0xd0ab65)
          place(t,.08,.24,1.06,.14,.49,p.stone)
          if(isBakery){
            const signCenter=vec(wall.a[0]+dx*t+nx*.22,2.67,wall.a[1]+dz*t+nz*.22)
            place(t,2.67,.18,.96,.42,.13,0x674c31)
            a.put('bush',signCenter.x+nx*.073,signCenter.y,signCenter.z+nz*.073,dx?.33:.043,.115,dx?.043:.33,0xebc28a)
          }
        }else{
          const glass=new T.Mesh(new T.BoxGeometry(dx?w:.055,top-bottom,dx?.055:w),new T.MeshStandardMaterial({color:0x92a79a,roughness:.45,emissive:0xffb85e,emissiveIntensity:.08}))
          glass.position.set(wall.a[0]+dx*t,(bottom+top)/2,wall.a[1]+dz*t)
          a.group.add(glass);glow.push(glass)
          place(t,(bottom+top)/2,0,.045,top-bottom,.18,p.wood)
          place(t,(bottom+top)/2+.06,0,w,.047,.18,p.wood)
          place(t,bottom-.036,.045,w+.17,.10,.34,p.stone)
        }
      }else{
        place(t,1.5,0,1,3,.20,p.plaster)
        for(let k=0;k<2;k++)place(i+.25+.50*k,.19,0,.477,.34,.24,shade(p.stone,(rng()-.5)*.085))
      }
    }
    for(const t of [0,len])place(t,1.5,0,.16,3.04,.25,p.wood)
    place(len/2,2.94,0,len,.13,.24,p.wood)
  }
  if(closed){
    const w=xmax-xmin,d=zmax-zmin,cx=(xmin+xmax)/2,cz=(zmin+zmax)/2
    a.put('box',cx,.032,cz,w,.064,d,shade(p.wood,.14))
    for(let i=0;i<w*2;i++)a.put('box',xmin+(i+.5)/2,.072,cz,.48,.022,d,shade(p.wood,.12+rng()*.09))
    if(showRoof){
      roof(a,cx,3.01,cz,w+.6,d+.65,Math.max(.85,d*.46),p,model.seed,theme<2)
      if(isBakery){
        const chimneyH=3.01+d*.46+.47
        a.put('box',cx+w*.27,chimneyH-.64,cz-.20,.48,1.30,.58,p.stone)
        a.put('box',cx+w*.27,chimneyH,cz-.20,.61,.15,.67,p.roof)
        a.group.userData.chimney=new T.Vector3(cx+w*.27,chimneyH+.2,cz-.20)
      }
    }
  }
  a.group.userData.glass=glow
  return a.finish()
}

export function lot(p:Palette,focus:boolean,plan=false) {
  const a=new Artist(),{width:w,depth:d}=plot
  if(plan){
    a.put('box',w/2,-.17,d/2,w+1.6,.34,d+1.6,p.stone)
    a.put('box',w/2,.005,d/2,w+.6,.065,d+.6,shade(p.grass,.07))
    for(let i=0;i<=w;i++)a.put('box',i,.043,d/2,.018,.013,d,shade(p.grass,-.04))
    for(let j=0;j<=d;j++)a.put('box',w/2,.043,j,w,.013,.018,shade(p.grass,-.04))
  }
  const color=focus?0xf1ca77:0xe9dea9
  for(let i=0;i<w;i++)for(const j of [0,d])a.put('box',i+.40,.064,j,.74,.055,.071,color)
  for(let j=0;j<d;j++)for(const i of [0,w])a.put('box',i,.064,j+.40,.071,.055,.74,color)
  for(const x of [0,w])for(const z of [0,d]){
    a.put('box',x,.27,z,.15,.56,.15,p.wood)
    a.put('box',x,.55,z,.19,.10,.19,color)
  }
  return a.finish()
}
