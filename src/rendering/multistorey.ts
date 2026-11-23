import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STOREY_HEIGHT, type MultiStoreyPlan } from '../multistorey'
import { palettes, disposeGroup } from './art'
import { cityLandmark } from './city-landmark'
import { configureTouchNavigation } from './touch-navigation'

/**
 * A camera and lighting adapter around the exact city geometry generator.
 * Free and career use the same 2D editor and the same actual 3D architecture.
 */
export class MultiStoreyView {
  private readonly renderer:T.WebGLRenderer
  private readonly scene=new T.Scene()
  private readonly camera=new T.PerspectiveCamera(43,1,.1,550)
  private readonly controls:OrbitControls
  private readonly root=new T.Group()
  private readonly observer:ResizeObserver
  private readonly grass=new T.Mesh(
    new T.BoxGeometry(28,.24,26),
    new T.MeshStandardMaterial({color:palettes[0].grass,roughness:1})
  )
  private readonly path=new T.Mesh(
    new T.BoxGeometry(13,.075,11),
    new T.MeshStandardMaterial({color:palettes[0].stone,roughness:1})
  )
  private generated:T.Group|null=null
  private frame=0
  private floorCount=0
  private disposed=false
  private animate=(now:number)=>{
    if(this.disposed)return
    this.frame=requestAnimationFrame(this.animate)
    if(document.hidden)return
    this.controls.update()
    this.renderer.render(this.scene,this.camera)
  }

  constructor(host:HTMLElement) {
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65))
    this.renderer.outputColorSpace=T.SRGBColorSpace
    this.renderer.toneMapping=T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure=1.18
    this.renderer.shadowMap.enabled=true
    this.renderer.shadowMap.type=T.PCFSoftShadowMap
    this.renderer.domElement.setAttribute('aria-label','3D-вид дома. Мышью вращай, колесом меняй масштаб; на экране одним пальцем перемещай вид, двумя вращай и меняй масштаб.')
    host.appendChild(this.renderer.domElement)
    this.camera.position.set(20,18,23)
    this.controls=new OrbitControls(this.camera,this.renderer.domElement)
    configureTouchNavigation(this.controls)
    this.controls.enableDamping=true
    this.controls.dampingFactor=.09
    this.controls.minDistance=6
    this.controls.maxDistance=170
    this.controls.maxPolarAngle=Math.PI/2-.04
    this.controls.target.set(6,3,5)
    this.scene.background=new T.Color(palettes[0].sky)
    this.scene.fog=new T.FogExp2(palettes[0].sky,.01)
    const ambient=new T.HemisphereLight(0xfff1db,0x819c82,2.25)
    const sun=new T.DirectionalLight(0xffe0ad,3.05)
    sun.position.set(-14,27,17)
    sun.castShadow=true
    sun.shadow.mapSize.set(1024,1024)
    sun.shadow.camera.left=-38;sun.shadow.camera.right=38
    sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38
    sun.shadow.bias=-.0005
    this.scene.add(ambient,sun,this.root)
    this.grass.position.set(6,-.29,5)
    this.path.position.set(6,-.115,5)
    this.grass.receiveShadow=true
    this.path.receiveShadow=true
    this.root.add(this.grass,this.path)
    this.observer=new ResizeObserver(()=>this.resize())
    this.observer.observe(host)
    this.resize()
    this.animate(0)
  }

  private resize() {
    const host=this.renderer.domElement.parentElement
    if(!host)return
    const w=Math.max(2,host.clientWidth),h=Math.max(2,host.clientHeight)
    this.camera.aspect=w/h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w,h,false)
  }

  render(plan:MultiStoreyPlan,view:{showRoof?:boolean;cutawayFloor?:number}={}) {
    if(this.generated){
      this.root.remove(this.generated)
      disposeGroup(this.generated)
      this.generated=null
    }
    const count=view.cutawayFloor===undefined?plan.floors.length:
      Math.max(1,Math.min(plan.floors.length,view.cutawayFloor+1))
    const floors=view.cutawayFloor===undefined?plan.floors:
      plan.floors.slice(0,count).map((floor,i)=>i===count-1?{...floor,stairToNext:null}:floor)
    // The city and workshop use exactly the same physical geometry.
    this.generated=cityLandmark({...plan,floors},palettes[0],0,
      {showRoof:view.showRoof!==false&&view.cutawayFloor===undefined})
    this.root.add(this.generated)
    if(count!==this.floorCount){
      this.floorCount=count
      const height=count*STOREY_HEIGHT
      const distance=Math.max(17,Math.min(145,height*1.5+13))
      this.controls.target.set(6,Math.min(height/2,35),5)
      this.camera.position.set(6+distance*.72,this.controls.target.y+distance*.62,5+distance*.8)
    }
    this.renderer.shadowMap.enabled=count<14
    this.controls.update()
  }

  dispose() {
    if(this.disposed)return
    this.disposed=true
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    this.controls.dispose()
    if(this.generated)disposeGroup(this.generated)
    this.grass.geometry.dispose()
    ;(this.grass.material as T.Material).dispose()
    this.path.geometry.dispose()
    ;(this.path.material as T.Material).dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
