import {Artist, random, shade, vec, roof, windowFrame, type Palette} from './art'
export function townHall(a:Artist,p:Palette,theme:number) {
  const rng=random(741),x=5,z=-3
  a.put('box',x,.19,z,10.2,.44,5.6,p.stone)
  a.put('box',x,2.34,z,9.8,4.3,5.2,p.plaster)
  const front=z+2.61
  for(let j=0;j<3;j++) for(let i=0;i<17;i++) {
    const bx=x-4.8+(i+.5)*.56
    a.put('box',bx,j*.25+.33,front,.54,.225,.14,shade(p.stone,(rng()-.5)*.13))
  }
  for(const xx of [x-4.7,x-2.4,x,x+2.4,x+4.7]) a.put('box',xx,2.47,front,.19,3.95,.18,p.wood)
  a.put('box',x,2.35,front,9.78,.15,.20,p.wood)
  a.put('box',x,4.36,front,10.05,.2,.21,p.wood)
  for(const xx of [x-3.53,x-1.18,x+1.18,x+3.53]) {
    windowFrame(a,xx,3.32,front+.08,.81,1.24,p)
    if(xx<x||xx>x+2)windowFrame(a,xx,1.43,front+.08,.72,1.23,p)
    a.beam(vec(xx-.97,2.47,front+.01),vec(xx-.55,2.92,front+.01),.09,p.wood)
  }
  for(let j=0;j<4;j++) a.put('box',x+1.2,.09+j*.105,front+.96-j*.21,1.95,.18,.49,p.stone)
  a.put('box',x+1.2,1.35,front+.10,1.23,2.04,.15,p.wood)
  a.put('box',x+1.2,1.31,front+.19,.92,1.75,.08,0x526c61)
  // The clock tower overlaps the eastern end of the main building.
  // Stop the pitched roof at its western wall; otherwise roof tiles cut through
  // the tower facade and hide the lower half of the clock face.
  const tx=x+4.66,tz=z-.65,sw=2.6
  const roofWest=x-10.65/2,roofEast=tx-sw/2+.06
  roof(a,(roofWest+roofEast)/2,4.53,z,roofEast-roofWest,6.30,2.83,p,42,theme===0||theme===1)
  // Move the dormer fronts towards the eaves. Their lower window edges must
  // stay above the sloping roof surface instead of disappearing behind tiles.
  const dormerFront=z+2.82
  for(const xx of [x-2.4,x+2.3]){
    const dormerCenter=dormerFront-.49
    a.put('box',xx,5.57,dormerCenter,1.26,1.4,.96,p.plaster)
    windowFrame(a,xx,5.61,dormerFront,.55,.77,p,false)
    a.put('box',xx,6.43,dormerCenter-.01,1.62,.15,1.62,shade(p.roof,-.08),.27)
  }
  a.put('box',x-3,6.68,z-1.12,.70,2.65,.77,p.stone)
  a.put('box',x-3,8.04,z-1.12,.89,.24,.94,p.roof)
  // Боковая башня возвышается над коньком, циферблат виден от моста.
  a.put('box',tx,4.12,tz,sw,8.3,sw,p.plaster)
  for(const side of [-1,1]) for(let j=0;j<17;j++){
    const q=shade(p.stone,(rng()-.5)*.12)
    a.put('box',tx+side*1.22,j*.45+.37,tz+1.27,j%2?.36:.50,.30,.15,q)
    a.put('box',tx+1.31,j*.45+.37,tz+side*1.18,.12,.30,j%2?.36:.54,q)
  }
  for(const y of [4.42,6.0,8.14])a.put('box',tx,y,tz,2.91,.21,2.91,p.stone)
  for(const side of [0,1]){
    const at=(u:number,v:number,offset:number)=>side?vec(tx+1.32+offset,v,tz-u):vec(tx+u,v,tz+1.32+offset)
    const cp=at(0,7.04,.01)
    a.put('cylinder',cp.x,cp.y,cp.z,1.54,.14,1.54,p.wood,Math.PI/2,0,side?-Math.PI/2:0)
    const fp=at(0,7.04,.10)
    a.put('cylinder',fp.x,fp.y,fp.z,1.34,.08,1.34,0xf2dfad,side?0:Math.PI/2,0,side?-Math.PI/2:0)
    for(let i=0;i<12;i++){
      const ang=i*Math.PI/6
      a.beam(at(Math.sin(ang)*.47,7.04+Math.cos(ang)*.47,.17),at(Math.sin(ang)*.57,7.04+Math.cos(ang)*.57,.17),.042,p.wood)
    }
    a.beam(at(0,7.04,.18),at(.24,7.36,.18),.06,p.wood)
    a.beam(at(0,7.04,.19),at(-.31,7.12,.19),.075,p.wood)
  }
  a.put('box',tx,8.75,tz,2.23,1.02,2.23,0x534d3e)
  for(const dx of [-1.14,1.14]) for(const dz of [-1.14,1.14])a.put('box',tx+dx,8.76,tz+dz,.26,1.26,.26,p.plaster)
  for(const [h,w,r] of [[9.75,2.24,1.25],[10.96,1.27,1.7],[12.06,.62,1.0]])a.put('cone',tx,h,tz,w,r,w,shade(p.roof,-.1),0,Math.PI/4)
  a.put('cylinder',tx,12.79,tz,.075,1.1,.075,p.wood)
  a.put('box',tx+.39,13.0,tz,.8,.34,.04,0xaf7641,0,.09,-.06)
  // Вьющаяся роза у входа.
  for(let i=0;i<120;i++){
    const t=rng(), bx=x-4.53+Math.sin(t*5)*.42+(rng()-.5)*.48
    a.put('canopy',bx,.5+t*3.1,front+.21,.14,.12,.11,rng()<.25?0xc49680:shade(p.leaf,rng()*.07))
  }
}
export function fountain(a:Artist,p:Palette){
  const x=-.65,z=.60
  a.put('cylinder',x,.12,z,3.15,.23,3.15,p.stone)
  a.put('cylinder',x,.32,z,2.78,.35,2.78,shade(p.stone,.04))
  a.put('cylinder',x,.51,z,2.42,.055,2.42,p.river)
  a.put('cylinder',x,.80,z,.49,.71,.49,shade(p.stone,-.04))
  a.put('cylinder',x,1.19,z,1.44,.18,1.44,p.stone)
  a.put('stone',x,1.49,z,.23,.30,.22,p.stone)
}
export function bench(a:Artist,x:number,z:number,rot:number,p:Palette) {
  const pos=(u:number,v:number)=>[x+u*Math.cos(rot)+v*Math.sin(rot),z-u*Math.sin(rot)+v*Math.cos(rot)]
  for(const u of [-.55,.55])for(const v of [-.18,.18]){const [bx,bz]=pos(u,v);a.put('box',bx,.28,bz,.11,.46,.11,p.wood,0,rot)}
  for(const v of [-.16,0,.16]){const [bx,bz]=pos(0,v);a.put('box',bx,.51,bz,1.61,.10,.14,0x9c7650,0,rot)}
  for(const h of [.74,.93]){const [bx,bz]=pos(0,-.23);a.put('box',bx,h,bz,1.61,.15,.10,0x9c7650,0,rot)}
}
