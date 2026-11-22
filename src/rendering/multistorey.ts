import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  STOREY_HEIGHT, wallLength, footprint, subtractRect, stairRect, columns, roofs,
  type MultiStoreyPlan, type Wall, type Opening, type Rect, type Staircase,
} from '../multistorey'

/** The workshop scene is a view of the exact same MultiStoreyPlan used by the 2D editor. */
export class MultiStoreyView {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(43, 1, .1, 350)
  private readonly controls: OrbitControls
  private readonly root = new THREE.Group()
  private readonly observer: ResizeObserver
  private readonly resizeHandler = () => this.resize()
  private readonly box = new THREE.BoxGeometry(1, 1, 1)
  private readonly batches = new Map<string, {material: THREE.Material; cast: boolean; matrices: THREE.Matrix4[]}>()
  private readonly materials = {
    plaster: new THREE.MeshStandardMaterial({color: 0xf2e6d2, roughness: .94}),
    plasterAlt: new THREE.MeshStandardMaterial({color: 0xe1cdb0, roughness: .92}),
    wood: new THREE.MeshStandardMaterial({color: 0x8d6248, roughness: .89}),
    trim: new THREE.MeshStandardMaterial({color: 0xfff2d6, roughness: .77}),
    slab: new THREE.MeshStandardMaterial({color: 0xb7a389, roughness: .96}),
    roof: new THREE.MeshStandardMaterial({color: 0xa75e4c, roughness: .91, side: THREE.DoubleSide}),
    terrace: new THREE.MeshStandardMaterial({color: 0xd5bfa1, roughness: .94}),
    glass: new THREE.MeshStandardMaterial({color: 0x8dc7d0, metalness: .13, roughness: .21, transparent: true, opacity: .82}),
    door: new THREE.MeshStandardMaterial({color: 0x65806c, roughness: .82}),
    column: new THREE.MeshStandardMaterial({color: 0xd9c8aa, roughness: .94}),
    stairs: new THREE.MeshStandardMaterial({color: 0xc29a75, roughness: .85}),
    grass: new THREE.MeshStandardMaterial({color: 0x8fb890, roughness: 1}),
    path: new THREE.MeshStandardMaterial({color: 0xe0cda7, roughness: 1}),
  }
  private frame = 0
  private disposed = false
  private lastFloorCount = -1
  private animate = () => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.animate)
    if (document.hidden) return
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  constructor(host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'})
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.28
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.domElement.setAttribute('aria-label', 'Объёмный вид здания. Перетаскивайте мышью для вращения, колесом изменяйте масштаб.')
    host.appendChild(this.renderer.domElement)
    this.camera.position.set(20, 19, 23)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = .09
    this.controls.minDistance = 6
    this.controls.maxDistance = 130
    this.controls.maxPolarAngle = Math.PI / 2 - .04
    this.controls.target.set(6, 3.4, 5)
    this.scene.background = new THREE.Color(0xc8dfd7)
    this.scene.fog = new THREE.FogExp2(0xc8dfd7, .012)
    const ambient = new THREE.HemisphereLight(0xfff1db, 0x7b9c87, 2.3)
    const sun = new THREE.DirectionalLight(0xffe3b6, 3.1)
    sun.position.set(-14, 24, 17)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -34
    sun.shadow.camera.right = 34
    sun.shadow.camera.top = 34
    sun.shadow.camera.bottom = -34
    sun.shadow.bias = -.0005
    this.scene.add(ambient, sun, this.root)
    this.observer = new ResizeObserver(this.resizeHandler)
    this.observer.observe(host)
    this.resize()
    this.animate()
  }

  private resize() {
    const host = this.renderer.domElement.parentElement
    if (!host) return
    const width = Math.max(2, host.clientWidth)
    const height = Math.max(2, host.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  /** Instancing batches hundreds of architectural components into a handful of draw calls. */
  private put(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material,
    cast = true, rotationZ = 0): void {
    const key = `${material.uuid}:${cast}`
    let batch = this.batches.get(key)
    if (!batch) {
      batch = {material, cast, matrices: []}
      this.batches.set(key, batch)
    }
    const matrix = new THREE.Matrix4()
    matrix.compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,rotationZ)),
      new THREE.Vector3(w,h,d))
    batch.matrices.push(matrix)
  }

  private flushBatches() {
    for (const {material, cast, matrices} of this.batches.values()) {
      if (!matrices.length) continue
      const mesh = new THREE.InstancedMesh(this.box, material, matrices.length)
      for(let i=0;i<matrices.length;i++) mesh.setMatrixAt(i, matrices[i])
      mesh.instanceMatrix.needsUpdate = true
      mesh.castShadow = cast
      mesh.receiveShadow = true
      this.root.add(mesh)
    }
    this.batches.clear()
  }

  private rectangle(r: Rect, y: number, material: THREE.Material, thickness = .16) {
    this.put((r.x0+r.x1)/2, y, (r.z0+r.z1)/2, r.x1-r.x0, thickness, r.z1-r.z0, material)
  }

  private wall(wall: Wall, openings: Opening[], floor: number, inside: boolean) {
    const len = wallLength(wall)
    if (!len) return
    const alongX = wall.a[1] === wall.b[1]
    const sign = alongX ? Math.sign(wall.b[0]-wall.a[0]) : Math.sign(wall.b[1]-wall.a[1])
    const baseY = floor * STOREY_HEIGHT + .19
    const totalHeight = inside ? 2.68 : 2.85
    const thickness = inside ? .105 : .21
    const plaster = inside ? this.materials.plasterAlt : this.materials.plaster
    const box = (offset: number, y: number, l: number, h: number, mat: THREE.Material, deep = thickness) => {
      if (h <= 0 || l <= 0) return
      const coordinate = (alongX ? wall.a[0] : wall.a[1]) + sign * offset
      const x = alongX ? coordinate : wall.a[0]
      const z = alongX ? wall.a[1] : coordinate
      this.put(x, baseY + y, z, alongX ? l : deep, h, alongX ? deep : l, mat)
    }
    for (let metre = 0; metre < len; metre++) {
      const o = openings.find(opening => opening.wallId===wall.id && opening.offset===metre+.5)
      const at = metre + .5
      if (!o) {
        box(at, totalHeight/2, 1.005, totalHeight, plaster)
        continue
      }
      const isDoor = o.kind === 'door'
      const innerWidth = isDoor ? .78 : .71
      const bottom = isDoor ? .04 : 1.14
      const top = isDoor ? 2.27 : 2.12
      box(at, bottom/2, 1.005, bottom, plaster)
      box(at, (top+totalHeight)/2, 1.005, totalHeight-top, plaster)
      const side = (1-innerWidth)/2
      for (const s of [-1, 1]) box(at+s*(innerWidth+side)/2, (bottom+top)/2, side+.008, top-bottom, plaster)
      if (isDoor) {
        box(at, (bottom+top)/2, innerWidth-.075, top-bottom-.06, this.materials.door, thickness+.018)
        box(at + (alongX ? .20 : -.20), 1.04, .057, .06, this.materials.trim, thickness+.075)
      } else {
        box(at, (bottom+top)/2, innerWidth-.025, top-bottom, this.materials.glass, thickness+.035)
        box(at, (bottom+top)/2, .06, top-bottom+.15, this.materials.trim, thickness+.1)
        box(at, (bottom+top)/2, innerWidth+.11, .06, this.materials.trim, thickness+.1)
        box(at, bottom-.065, innerWidth+.28, .13, this.materials.trim, thickness+.30)
        if (!inside) {
          // Window flower box, independent of the placement direction of a wall.
          box(at, bottom-.23, innerWidth+.18, .16, this.materials.wood, thickness+.34)
        }
      }
    }
    if (!inside) {
      const p = (alongX ? wall.a[0] : wall.a[1])
      const q = (alongX ? wall.b[0] : wall.b[1])
      const at = (p+q)/2
      const x = alongX ? at : wall.a[0]
      const z = alongX ? wall.a[1] : at
      this.put(x, baseY + totalHeight-.06, z, alongX?len+.14:.25, .15, alongX?.25:len+.14, this.materials.wood)
    }
  }

  private stair(stair: Staircase, floor: number) {
    const rect = stairRect(stair)
    const alongX = stair.facing === 'east' || stair.facing === 'west'
    const reverse = stair.facing === 'west' || stair.facing === 'north'
    const length = alongX ? rect.x1-rect.x0 : rect.z1-rect.z0
    const count = 15
    const y0 = floor*STOREY_HEIGHT + .24
    for(let i=0;i<count;i++) {
      const t=(i+.5)/count
      const distance=reverse ? length*(1-t) : length*t
      const y=y0+(i+.5)*((STOREY_HEIGHT-.3)/count)
      const x=alongX?rect.x0+distance:(rect.x0+rect.x1)/2
      const z=alongX?(rect.z0+rect.z1)/2:rect.z0+distance
      this.put(x,y,z,alongX?length/count+.02:1.64,.12,alongX?1.64:length/count+.02,this.materials.stairs)
    }
    // Side railing makes the stair volume legible in the 3D view.
    for (const s of [-1,1]) {
      for(let i=0;i<5;i++){
        const t=(i+.5)/5
        const distance=reverse?length*(1-t):length*t
        const y=y0+t*(STOREY_HEIGHT-.3)+.43
        const x=alongX?rect.x0+distance:(rect.x0+rect.x1)/2+s*.89
        const z=alongX?(rect.z0+rect.z1)/2+s*.89:rect.z0+distance
        this.put(x,y,z,.075,.85,.075,this.materials.wood)
      }
    }
  }

  private gable(r: Rect, base: number) {
    const width = r.x1-r.x0
    const depth = r.z1-r.z0
    const rise = Math.min(2.4, Math.max(.72, width*.23))
    const half = width / 2 + .22
    const hypotenuse = Math.hypot(half, rise)
    const pitch = Math.atan2(rise, half)
    for(const dir of [-1,1]) {
      this.put((r.x0+r.x1)/2 + dir*width/4, base+rise/2, (r.z0+r.z1)/2,
        hypotenuse, .15, depth+.55, this.materials.roof, true, -dir*pitch)
    }
    // Ridge tile
    this.put((r.x0+r.x1)/2,base+rise,(r.z0+r.z1)/2,.16,.19,depth+.6,this.materials.wood)
  }

  render(plan: MultiStoreyPlan, view: {showRoof?: boolean; cutawayFloor?: number} = {}) {
    // All geometry is deterministic and derived from the editor model.
    for(const child of [...this.root.children]) {
      this.root.remove(child)
      if (child instanceof THREE.InstancedMesh) child.dispose()
    }
    // Box geometry and materials are shared and intentionally not disposed on rebuild.
    const base = this.materials
    this.put(6,-.21,5,26,.3,24,base.grass,false)
    this.put(6,-.045,5,14,.065,12,base.path,false)
    const highestVisible = view.cutawayFloor === undefined ? plan.floors.length-1 :
      Math.max(0, Math.min(plan.floors.length-1, view.cutawayFloor))
    plan.floors.forEach((floor, i) => {
      if (i>highestVisible) return
      const r = footprint(floor)
      if (!r) return
      // Cut a stairwell in every slab when stairs rise from the floor below.
      const previous = plan.floors[i-1]?.stairToNext
      const slabPieces=previous ? subtractRect(r, stairRect(previous)) : [r]
      for(const piece of slabPieces) this.rectangle(piece, i*STOREY_HEIGHT+.04, base.slab, .19)
      for(const wall of floor.walls) this.wall(wall, floor.openings, i, false)
      for(const partition of floor.partitions) this.wall(partition, floor.openings, i, true)
      if(floor.stairToNext && i<plan.floors.length-1) this.stair(floor.stairToNext, i)
    })
    for(const support of columns(plan)) {
      if(support.upperFloor>highestVisible)continue
      const height = support.toY-support.fromY
      if(height > 0) this.put(support.x,support.fromY+height/2,support.z,.26,height,.26,base.column)
    }
    if(view.showRoof !== false && view.cutawayFloor === undefined) {
      for(const section of roofs(plan)) {
        if(section.kind === 'setback') this.rectangle(section,section.y+.03,base.terrace,.17)
        else this.gable(section,section.y-.14)
      }
    }
    this.flushBatches()
    const activeHeight=(highestVisible+1)*STOREY_HEIGHT
    if(highestVisible+1!==this.lastFloorCount) {
      this.controls.target.set(6,Math.min(activeHeight/2,15),5)
      const distance=Math.max(16,Math.min(86,activeHeight*1.5+14))
      this.camera.position.set(6+distance*.75, this.controls.target.y + distance*.65, 5+distance*.8)
      this.lastFloorCount=highestVisible+1
    }
    this.renderer.shadowMap.enabled=plan.floors.length<14
    this.controls.update()
  }

  dispose(){
    this.disposed=true
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    this.controls.dispose()
    this.box.dispose()
    Object.values(this.materials).forEach(material=>material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
