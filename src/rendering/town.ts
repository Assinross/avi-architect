import * as T from 'three'
import {Artist, random, shade, vec, roof, windowFrame, type Palette} from './art'
export function townHall(a:Artist,p:Palette,theme:number) {
  const rng=random(741),x=5,z=-3
  a.put('box',x,.19,z,10.2,.44,5.6,p.stone)
  const front=z+2.61
  // The town hall is hollow: cut actual openings instead of placing opaque
  // window decorations on a solid plaster box.
  const upperWindows=[x-3.53,x-1.18,x+1.18,x+3.53]
  const lowerWindows=[x-3.53,x-1.18,x+3.53]
  const openings=[
    ...upperWindows.map(xx=>({x:xx,w:.81,bottom:2.70,top:3.94})),
    ...lowerWindows.map(xx=>({x:xx,w:.72,bottom:.815,top:2.045})),
    {x:x+1.2,w:1.23,bottom:.33,top:2.37}, // front door
  ]
  const edges=[x-4.9,x+4.9,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])].sort((a,b)=>a-b)
  for(let i=0;i<edges.length-1;i++){
    const left=edges[i],right=edges[i+1]
    if(right-left<.0001)continue
    const mid=(left+right)/2
    const holes=openings.filter(o=>Math.abs(mid-o.x)<o.w/2-.0001).sort((a,b)=>a.bottom-b.bottom)
    let bottom=.19
    for(const hole of holes){
      if(hole.bottom>bottom+.0001)
        a.put('box',mid,(bottom+hole.bottom)/2,front-.09,right-left,hole.bottom-bottom,.18,p.plaster)
      bottom=Math.max(bottom,hole.top)
    }
    if(bottom<4.49)a.put('box',mid,(bottom+4.49)/2,front-.09,right-left,4.49-bottom,.18,p.plaster)
  }
  // Rear/side masonry and two furnished floors, visible through the glazing.
  a.put('box',x,2.34,z-2.51,9.8,4.3,.18,p.plaster)
  for(const side of [-1,1])a.put('box',x+side*4.81,2.34,z,.18,4.3,5.2,p.plaster)
  a.put('box',x,.46,z,9.5,.10,4.92,shade(p.wood,.12))
  a.put('box',x,2.52,z,9.5,.17,4.92,shade(p.wood,.10))
  const glassMaterial=new T.MeshStandardMaterial({
    color:0xb7d5cb,roughness:.18,metalness:.05,transparent:true,opacity:.23,
    depthWrite:false,side:T.DoubleSide,
  })
  const hallWindow=(xx:number,yy:number,w:number,h:number)=>{
    const frameZ=front+.13
    // Open centre: only perimeter, mullions and transparent pane fill the hole.
    for(const side of [-1,1])
      a.put('box',xx+side*w/2,yy,frameZ,.09,h+.15,.15,p.wood)
    for(const side of [-1,1])
      a.put('box',xx,yy+side*h/2,frameZ,w+.16,.09,.15,p.wood)
    a.put('box',xx,yy,frameZ+.042,.047,h,.055,0xf1e6c9)
    a.put('box',xx,yy+.06,frameZ+.042,w,.045,.055,0xf1e6c9)
    a.put('box',xx,yy-h/2-.075,front+.15,w+.32,.13,.32,p.stone)
    for(const side of [-1,1]){
      a.put('box',xx+side*w*.84,yy,front+.09,w*.41,h,.10,0x62776a)
      for(let i=1;i<=4;i++)
        a.put('box',xx+side*w*.84,yy-h/2+i*h/5,front+.16,w*.36,.04,.035,0x475f54)
    }
    const pane=new T.Mesh(new T.PlaneGeometry(w-.08,h-.08),glassMaterial)
    pane.position.set(xx,yy,front+.135)
    a.group.add(pane)
  }
  const furnish=(xx:number,upper:boolean)=>{
    const floorY=upper?2.61:.52
    const deskY=floorY+.66
    const deskZ=front-.83
    const timber=shade(p.wood,.17)
    a.put('box',xx,deskY,deskZ,.83,.10,.59,timber)
    for(const dx of [-.33,.33])for(const dz of [-.22,.22])
      a.put('box',xx+dx,(floorY+deskY)/2,deskZ+dz,.07,deskY-floorY,.07,p.wood)
    // Papers, ledger and a small inkpot on the clerk's desk.
    a.put('box',xx-.16,deskY+.062,deskZ,.30,.018,.21,0xf6e9cb)
    a.put('box',xx+.23,deskY+.09,deskZ-.12,.15,.12,.20,0x64837c)
    a.put('cylinder',xx+.21,deskY+.16,deskZ+.14,.075,.12,.075,0x405f69)
    // Chair facing the desk, with a backrest.
    a.put('box',xx, floorY+.38,deskZ-.61,.43,.09,.42,0x94704f)
    a.put('box',xx, floorY+.68,deskZ-.80,.43,.60,.09,p.wood)
    for(const dx of [-.16,.16])
      a.put('box',xx+dx,floorY+.20,deskZ-.62,.06,.39,.07,p.wood)
    // Shelves and brightly coloured book spines beyond the desk.
    const shelfZ=front-2.14,shelfY=floorY+.91
    for(const dx of [-.45,.45])
      a.put('box',xx+dx,shelfY,shelfZ,.09,1.73,.39,p.wood)
    for(let row=0;row<4;row++){
      const yy=floorY+.16+row*.45
      a.put('box',xx,yy,shelfZ,.99,.09,.43,timber)
      if(row===3)continue
      for(let book=0;book<7;book++){
        const colors=[0x638b80,0xb06b53,0xc0a46e,0x647d9e,0x926b88]
        a.put('box',xx-.36+book*.12,yy+.20,shelfZ,.09,.32+(book%3)*.035,.26,colors[(book+row)%colors.length])
      }
    }
  }
  for(const xx of upperWindows){hallWindow(xx,3.32,.81,1.24);furnish(xx,true)}
  for(const xx of lowerWindows){hallWindow(xx,1.43,.72,1.23);furnish(xx,false)}
  for(let j=0;j<3;j++) for(let i=0;i<17;i++) {
    const bx=x-4.8+(i+.5)*.56
    a.put('box',bx,j*.25+.33,front,.54,.225,.14,shade(p.stone,(rng()-.5)*.13))
  }
  for(const xx of [x-4.7,x-2.4,x,x+2.4,x+4.7]) a.put('box',xx,2.47,front,.19,3.95,.18,p.wood)
  a.put('box',x,2.35,front,9.78,.15,.20,p.wood)
  a.put('box',x,4.36,front,10.05,.2,.21,p.wood)
  for(const xx of upperWindows)
    a.beam(vec(xx-.97,2.47,front+.01),vec(xx-.55,2.92,front+.01),.09,p.wood)
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
  // Easter egg on the rear (-Z) wall: hand-painted "67", invisible
  // from the bridge-facing clock dial, but discoverable by orbiting the town.
  // Viewed from -Z, screen-right is world -X: mirror local X once.
  const graffiti=(points:[number,number][],color:number)=>{
    for(let i=1;i<points.length;i++){
      const [ax,ay]=points[i-1],[bx,by]=points[i]
      a.beam(vec(tx-ax,ay,tz-1.336),vec(tx-bx,by,tz-1.336),.132,0x34444b,.058)
      a.beam(vec(tx-ax,ay,tz-1.363),vec(tx-bx,by,tz-1.363),.082,color,.047)
    }
  }
  graffiti([[-.15,5.66],[-.42,5.69],[-.66,5.48],[-.70,5.06],[-.51,4.86],[-.20,4.95],[-.20,5.19],[-.43,5.33],[-.68,5.21]],0xf18b67)
  graffiti([[.08,5.67],[.77,5.67],[.41,5.27],[.22,4.85]],0x6fbbb2)
  for(const [dx,dy,c] of [[-.91,5.50,0xf18b67],[-.85,5.23,0xf18b67],[.86,5.32,0x6fbbb2],[.67,4.84,0x6fbbb2],[.95,5.66,0xf7ce81]] as const)
    a.put('canopy',tx-dx,dy,tz-1.36,.042,.033,.019,c)
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
