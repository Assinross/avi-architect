import * as T from 'three'

export type Palette = typeof palettes[number]
export const palettes = [
  {grass:0x99a35e, leaf:0x657d41, pale:0xaab368, roof:0xaa5038, plaster:0xf1dcb4, wood:0x67503b, stone:0xb2a792, river:0x669e98, sky:0xc7d9cb, hill:0x889f86},
  {grass:0xaac36e, leaf:0x478a62, pale:0xaac34e, roof:0xc56047, plaster:0xfadca3, wood:0x694738, stone:0xc4b99f, river:0x5faaa9, sky:0xc5e0e1, hill:0x88a78c},
  {grass:0xa4ae83, leaf:0x608879, pale:0x99aa7f, roof:0x627d79, plaster:0xe8e4d5, wood:0x726456, stone:0xb4b7a9, river:0x71a8a2, sky:0xd1dedc, hill:0x95ada2},
  {grass:0x9cbba1, leaf:0x568e89, pale:0x9dbd8c, roof:0x678b9d, plaster:0xe4e2d4, wood:0x6e7168, stone:0xb7b9bb, river:0x80bcbb, sky:0xcedfdf, hill:0x91b0a8}
]
export function random(seed:number) {
  return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296 }
}
export function shade(color:number, light:number) { return new T.Color(color).offsetHSL(0,0,light).getHex() }
const box = new T.BoxGeometry(1,1,1)
const cylinder = new T.CylinderGeometry(.5,.5,1,10)
const canopy = new T.IcosahedronGeometry(1,0)
const bush = new T.IcosahedronGeometry(1,1)
const cone = new T.ConeGeometry(1,1,8)
const stone = new T.DodecahedronGeometry(1,0)
const tile = new T.CylinderGeometry(1,1,1,6,1,false,0,Math.PI)
export const shapes = {box,cylinder,canopy,bush,cone,stone,tile}
type Shape = keyof typeof shapes
type Batch = { matrices:T.Matrix4[], colors:T.Color[] }
const scratch = new T.Object3D()
export class Artist {
  group = new T.Group()
  batches = new Map<Shape,Batch>()
  put(type:Shape,x:number,y:number,z:number,w:number,h:number,d:number,color:number,rx=0,ry=0,rz=0) {
    let batch=this.batches.get(type)
    if(!batch){batch={matrices:[],colors:[]};this.batches.set(type,batch)}
    scratch.position.set(x,y,z); scratch.rotation.set(rx,ry,rz); scratch.scale.set(w,h,d); scratch.updateMatrix()
    batch.matrices.push(scratch.matrix.clone()); batch.colors.push(new T.Color(color))
  }
  beam(a:T.Vector3,b:T.Vector3,w:number,color:number,thickness=w) {
    const mid=a.clone().lerp(b,.5), q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())
    const rot=new T.Euler().setFromQuaternion(q)
    this.put('box',mid.x,mid.y,mid.z,w,a.distanceTo(b),thickness,color,rot.x,rot.y,rot.z)
  }
  finish() {
    const material=new T.MeshStandardMaterial({roughness:.94,flatShading:true, side:T.DoubleSide})
    for(const [key,b] of this.batches) {
      const mesh=new T.InstancedMesh(shapes[key],material,b.colors.length)
      b.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,b.colors[i])})
      mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh)
    }
    this.batches.clear()
    return this.group
  }
}
export function custom(group:T.Group,points:number[],indices:number[],colors:number[],flat=true) {
  const geo=new T.BufferGeometry()
  geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices)
  if(colors.length)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  geo.computeVertexNormals()
  const mat=new T.MeshStandardMaterial({vertexColors:!!colors.length,roughness:1,flatShading:flat,side:T.DoubleSide})
  const mesh=new T.Mesh(geo,mat);mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);return mesh
}
export const vec=(x:number,y:number,z:number)=>new T.Vector3(x,y,z)
export function roof(a:Artist,x:number,y:number,z:number,width:number,depth:number,rise:number,p:Palette,seed:number,tiles=true) {
  const rng=random(seed), half=depth/2, length=Math.hypot(half,rise), angle=Math.atan2(rise,half)
  for(const s of [-1,1]){
    a.put('box',x,y+rise/2,z+s*half/2,width,.15,length,p.roof,s*angle)
    if(tiles){
      const rows=Math.max(2,Math.ceil(length/.42)),cols=Math.ceil(width/.47)
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const t=(j+.5)/rows
        const tx=x-width/2+(i+.5+(j%2)*.12)*width/cols
        a.put('box',tx,y+rise*(1-t)+.09,z+s*half*t,width/cols*.97,.065,length/rows*1.09,shade(p.roof,(rng()-.48)*.10),s*angle)
      }
    } else {
      for(let i=0;i<width;i+=.65)a.put('box',x-width/2+i,y+rise/2+.1,z+s*half/2,.07,.09,length,shade(p.roof,-.07),s*angle)
    }
    for(const end of [-1,1])a.beam(vec(x+end*width/2,y,z+s*half),vec(x+end*width/2,y+rise,z),.14,p.wood)
    a.put('box',x,y-.035,z+s*half,width+.10,.20,.18,p.wood)
  }
  a.put('box',x,y+rise+.11,z,width+.16,.19,.25,shade(p.roof,.07))
  for(const end of [-1,1]) {
    const wallx=x+end*(width/2-.32)
    const c=new T.Color(p.plaster).toArray()
    custom(a.group,[wallx,y,z-half+.32,wallx,y+rise-.12,z,wallx,y,z+half-.32],[0,1,2],[...c,...c,...c])
    a.put('box',wallx+.025*end,y+rise*.45,z,.14,rise*.9,.14,p.wood)
  }
}
export function windowFrame(a:Artist,x:number,y:number,z:number,w:number,h:number,p:Palette,shutters=true) {
  a.put('box',x,y,z,w+.16,h+.20,.14,p.wood)
  a.put('box',x,y,z+.085,w,h,.05,0x696f60)
  a.put('box',x-w*.18,y+h*.12,z+.12,w*.28,h*.64,.025,0x9fafa1)
  a.put('box',x,y,z+.14,.055,h,.04,p.plaster)
  a.put('box',x,y+.06,z+.14,w,.06,.04,p.plaster)
  a.put('box',x,y-h/2-.07,z+.09,w+.36,.13,.33,p.stone)
  if(shutters) for(const side of [-1,1]){
    a.put('box',x+side*w*.83,y,z,w*.44,h,.10,0x62776a)
    for(let i=1;i<=4;i++) a.put('box',x+side*w*.83,y-h/2+i*h/5,z+.065,w*.39,.045,.035,0x475f54)
  }
}
export function disposeGroup(group:T.Group) {
  const mats=new Set<T.Material>()
  group.traverse(obj=>{
    if(obj instanceof T.Mesh){
      if(obj instanceof T.InstancedMesh)obj.dispose()
      if(!Object.values(shapes).includes(obj.geometry))obj.geometry.dispose()
      for(const m of (Array.isArray(obj.material)?obj.material:[obj.material])) mats.add(m)
    }
  })
  mats.forEach(m=>m.dispose())
}
