import { riverDistrict } from './rendering/riverworks'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { plot, type BuildingModel, type CityWorld, type Purpose } from './model'
import { Artist, disposeGroup, palettes, shapes, vec, type Palette } from './rendering/art'
import { landscape, lots, landmarkLot, unit } from './rendering/land'
import { cityLandmark } from './rendering/city-landmark'
import { STOREY_HEIGHT,type MultiStoreyPlan } from './multistorey'
import { house, lot } from './rendering/building'
import { planSiteAccess } from './site-access'
import { renderSite } from './rendering/site'

type Target = Purpose | 'landmark' | 'mayor' | 'resident' | 'baker' | 'nika'
type Citizen = {actor:T.Group; legs:T.Mesh[]; name:Target; stops:T.Vector3[]; index:number; resting:number; atDoor:boolean; doorStop:number|null}
const origin=(purpose:Purpose)=>vec(lots[purpose].x-plot.width*unit/2,.045,lots[purpose].z-plot.depth*unit/2)
const landmarkOrigin=()=>vec(landmarkLot.x-plot.width*unit/2,.045,landmarkLot.z-plot.depth*unit/2)
function accessRoute(access:NonNullable<ReturnType<typeof planSiteAccess>>){
  // NPC stops just outside the door, at the point on the new paving.
  return access.route.slice(0,-1).map(p=>vec(p.x,.05,p.z))
}
function returnStops(route:T.Vector3[],home:T.Vector3){
  // Go out along the SAME private path; never walk through the footprint.
  return [...route,...route.slice(0,-1).reverse().map(p=>p.clone()),home]
}
function resident(name:Target,coat:number):Citizen {
  const a=new Artist(),apron=name==='baker',skin=name==='mayor'?0xc99871:0xe2b28c
  a.put('bush',0,1.32,0,.145,.18,.15,skin)
  a.put('box',0,1.01,0,.32,.43,.21,coat)
  a.put('box',0,.75,0,.34,.19,.25,apron?0xe9d9b6:coat)
  a.put('box',0,1.01,.12,.19,.39,.03,apron?0xe8dbbb:0xb99572)
  for(const s of [-1,1]){
    a.put('box',s*.21,1.05,0,.095,.31,.13,coat,0,0,s*.10)
    a.put('bush',s*.227,.84,.007,.052,.074,.056,skin)
  }
  if(name==='mayor'){
    a.put('cylinder',0,1.47,0,.41,.045,.41,0x5e5641)
    a.put('cylinder',0,1.54,0,.29,.14,.29,0x5e5641)
  }else{
    a.put('bush',0,1.45,-.015,.16,.10,.15,apron?0xede1cc:0x79583f)
    if(apron)a.put('bush',0,1.54,-.013,.17,.13,.16,0xf2e9d8)
  }
  const actor=a.finish(),legs:T.Mesh[]=[]
  const mat=new T.MeshStandardMaterial({color:0x534f42})
  for(const s of [-1,1]){
    const leg=new T.Mesh(shapes.box,mat);leg.position.set(s*.084,.40,0);leg.scale.set(.12,.60,.15)
    leg.castShadow=true;actor.add(leg);legs.push(leg)
  }
  return {actor,legs,name,stops:[],index:0,resting:0,atDoor:false,doorStop:null}
}

export class Valley{
  private renderer:T.WebGLRenderer
  private scene=new T.Scene()
  private camera=new T.PerspectiveCamera(42,1,.1,235)
  private controls:OrbitControls
  private terrain:T.Group|null=null
  private objects=new T.Group()
  private sun=new T.DirectionalLight(0xffe4b5,2.25)
  private ambient=new T.HemisphereLight(0xfff3d7,0x899372,1.77)
  private theme=-1
  private citizens:Citizen[]=[]
  private hitboxes:T.Object3D[]=[]
  private glass:T.Mesh[]=[]
  private smoke:T.Mesh[]=[]
  private chimney:T.Vector3|null=null
  private focus:T.Vector3|null=null
  private eye:T.Vector3|null=null
  private frozen=false
  private mode:'city'|'preview'='city'
  private cityKey=''
  private previewKey=''
  private frame=0
  private last=0
  private elapsed=0
  private quality:CityWorld['quality']='auto'
  private observer:ResizeObserver
  private aspect=1
  private lowFrames=0
  private autoRatio=1.5
  private down:T.Vector2|null=null
  private callback:(target:Target)=>void
  constructor(private host:HTMLElement,onPick:(target:Target)=>void){
    this.callback=onPick
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08
    this.host.appendChild(this.renderer.domElement)
    this.controls=new OrbitControls(this.camera,this.renderer.domElement)
    this.controls.enableDamping=true;this.controls.dampingFactor=.095
    this.controls.maxPolarAngle=Math.PI*.475;this.controls.minPolarAngle=.22
    this.controls.minDistance=5;this.controls.maxDistance=57
    this.controls.addEventListener('start',()=>{this.focus=null;this.eye=null})
    this.scene.add(this.ambient,this.sun,this.sun.target,this.objects)
    this.sun.position.set(-18,36,20);this.sun.castShadow=true
    Object.assign(this.sun.shadow.camera,{left:-31,right:31,top:28,bottom:-28,near:.5,far:100})
    this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.bias=-.00045;this.sun.shadow.normalBias=.026
    this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.host)
    this.setView(undefined,true)
    this.renderer.domElement.addEventListener('pointerdown',this.startPick)
    this.renderer.domElement.addEventListener('pointerup',this.endPick)
    this.frame=requestAnimationFrame(this.animate)
  }
  private startPick=(e:PointerEvent)=>{this.down=e.isPrimary?new T.Vector2(e.clientX,e.clientY):null}
  private endPick=(e:PointerEvent)=>{
    if(!this.down||this.mode!=='city'||this.frozen)return
    const distance=this.down.distanceTo(new T.Vector2(e.clientX,e.clientY));this.down=null
    if(distance>7||e.button!==0)return
    const b=this.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster()
    ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2),this.camera)
    const hit=ray.intersectObjects(this.hitboxes,false)[0]
    if(hit)this.callback(hit.object.userData.target)
  }
  private resize(){
    const w=this.host.clientWidth||window.innerWidth,h=this.host.clientHeight||window.innerHeight
    this.aspect=w/h;this.camera.aspect=this.aspect;this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.quality==='high'?2:this.quality==='low'?1:this.autoRatio))
    this.renderer.setSize(w,h,false)
  }
  private setView(focus?:Purpose|'landmark',immediate=false) {
    const place=focus==='landmark'?landmarkLot:focus?lots[focus]:null
    const target=place?vec(place.x,focus==='landmark'?3.3:1.15,place.z):vec(this.aspect<.85?4.0:-.3,2.5,-.7)
    const eye=target.clone().add(focus?vec(8.8,9.3,12.8):this.aspect<.85?vec(12.4,11,24):vec(10.4,10.7,23.8))
    if(immediate){this.controls.target.copy(target);this.camera.position.copy(eye);this.controls.update()}
    else{this.focus=target;this.eye=eye}
  }
  private clearObjects(){
    this.scene.remove(this.objects);disposeGroup(this.objects);this.objects=new T.Group();this.scene.add(this.objects)
    this.citizens=[];this.hitboxes=[];this.glass=[];this.smoke=[];this.chimney=null
  }
  private addHit(target:Target,pos:T.Vector3,dimensions:T.Vector3,parent:T.Object3D=this.objects){
    const mat=new T.MeshBasicMaterial({visible:false})
    const mesh=new T.Mesh(shapes.box,mat);mesh.scale.copy(dimensions);mesh.position.copy(pos);mesh.userData.target=target
    parent.add(mesh);this.hitboxes.push(mesh)
  }
  private lighting(p:Palette,theme:number){
    this.scene.background=new T.Color(p.sky)
    this.scene.fog=new T.FogExp2(p.sky,.012)
    this.sun.color.setHex(theme===3?0xd4f1ff:theme===2?0xffeed6:0xffdfaa)
  }
  city(world:CityWorld,focus?:Purpose|'landmark'){
    const previous=this.mode,themeChanged=this.theme!==world.theme
    const focusKey=focus??'', key=JSON.stringify([world.theme,world.buildings,world.careerPlans,world.landmark,world.riverworks,focusKey])
    if(this.quality!==world.quality){
      this.quality=world.quality;this.resize()
      this.sun.castShadow=this.quality!=='low'
    }
    if(this.cityKey===key&&previous==='city')return
    this.mode='city';this.previewKey='';this.cityKey=key
    const p=palettes[world.theme];this.lighting(p,world.theme)
    if(themeChanged||!this.terrain){
      if(this.terrain){this.scene.remove(this.terrain);disposeGroup(this.terrain)}
      this.terrain=landscape(p,world.theme);this.scene.add(this.terrain);this.theme=world.theme
    }
    this.terrain.visible=true;this.clearObjects()
    if(world.riverworks)this.objects.add(riverDistrict(world.riverworks,p))
    for(const purpose of ['home','bakery'] as const){
      const model=world.buildings[purpose],base=origin(purpose)
      const plan=world.careerPlans[purpose]
      const group=model?(plan?cityLandmark(plan,p,world.theme):house(model,p,true,world.theme)):lot(p,focus===purpose)
      group.scale.setScalar(unit);group.position.copy(base);this.objects.add(group)
      if(model){
        const access=planSiteAccess(purpose,plan?.floors[0]??model)
        if(access)this.objects.add(renderSite(access,p))
      }
      this.glass.push(...(group.userData.glass??[]))
      if(group.userData.chimney){
        this.chimney=group.userData.chimney.clone().multiplyScalar(unit).add(base)
        const mat=new T.MeshStandardMaterial({color:0xd2cbbb,transparent:true,opacity:.36,depthWrite:false,flatShading:true})
        for(let i=0;i<5;i++){const puff=new T.Mesh(shapes.bush,mat);this.objects.add(puff);this.smoke.push(puff)}
      }
      this.addHit(purpose,vec(lots[purpose].x,model?1:.1,lots[purpose].z),vec(plot.width*unit,model?2:.3,plot.depth*unit))
    }
    if(world.buildings.bakery){
      const plan=world.landmark
      const extra=plan?cityLandmark(plan,p,world.theme):lot(p,focus==='landmark')
      extra.scale.setScalar(unit);extra.position.copy(landmarkOrigin());this.objects.add(extra)
      if(plan){
        const access=planSiteAccess('landmark',plan.floors[0])
        if(access)this.objects.add(renderSite(access,p))
      }
      const height=plan?plan.floors.length*STOREY_HEIGHT*unit:0
      this.addHit('landmark',vec(landmarkLot.x,plan?height/2:.12,landmarkLot.z),
        vec(plot.width*unit,plan?height+.4:.35,plot.depth*unit))
    }
    const mayor=resident('mayor',0x495d65),emma=resident('resident',0x8f685e),baker=resident('baker',0x8b7660)
    const nika=resident('nika',0x65836d)
    for(const person of world.buildings.bakery?[mayor,emma,baker,nika]:[mayor,emma,baker]){
      const first=person.name==='mayor'?vec(4.7,.05,.9):person.name==='resident'?vec(-1.7,.05,2.65):person.name==='nika'?vec(-17.6,.05,-2.0):vec(7.9,.05,2.45)
      person.actor.position.copy(first)
      const model=person.name==='resident'?world.buildings.home:person.name==='baker'?world.buildings.bakery:undefined
      if(model){
        const access=planSiteAccess(model.purpose,world.careerPlans[model.purpose]?.floors[0]??model)
        if(access){
          const route=accessRoute(access)
          person.doorStop=route.length-1
          person.stops=returnStops(route,first)
        }
      }else if(person.name==='nika'&&world.landmark){
        const access=planSiteAccess('landmark',world.landmark.floors[0])
        if(access){
          const route=accessRoute(access)
          person.doorStop=route.length-1
          person.stops=returnStops(route,first)
        }
      }
      if(!person.stops.length)
        person.stops=[first,first.clone().add(vec(1.4,0,.38)),first.clone().add(vec(-.65,0,.55))]
      if(person===mayor&&world.buildings.bakery){
        const access=planSiteAccess('bakery',world.careerPlans.bakery?.floors[0]??world.buildings.bakery)
        if(access)person.stops.push(vec(12,.05,4),...accessRoute(access),vec(13,.05,4.8))
      }
      this.citizens.push(person);this.objects.add(person.actor)
      this.addHit(person.name,vec(0,.80,0),vec(.85,1.65,.85),person.actor)
    }
    this.controls.minDistance=5;this.controls.maxDistance=world.landmark?100:57;this.setView(focus,themeChanged&&previous==='city'&&!focus)
  }
  preview(model:BuildingModel,theme:number,roof:boolean){
    const key=JSON.stringify([model,theme,roof])
    if(this.mode==='preview'&&this.previewKey===key)return
    const entering=this.mode!=='preview';this.mode='preview';this.previewKey=key;this.cityKey=''
    if(this.terrain)this.terrain.visible=false
    this.clearObjects()
    const p=palettes[theme];this.lighting(p,theme)
    this.scene.background=new T.Color(0xc7cebb);this.scene.fog=null
    this.objects.add(lot(p,true,true),house(model,p,roof,theme))
    const a=new Artist();a.put('cylinder',6,-.60,5,80,.52,80,0xbac3a9);this.objects.add(a.finish())
    this.controls.minDistance=4;this.controls.maxDistance=38
    if(entering){
      this.controls.target.set(6,1.05,5)
      this.camera.position.copy(this.controls.target).add(vec(9,9.5,14))
      this.focus=null;this.eye=null;this.controls.update()
    }
  }
  pause(value:boolean){this.frozen=value;this.controls.enabled=!value;this.last=0}
  private animate=(now:number)=>{
    this.frame=requestAnimationFrame(this.animate)
    if(this.frozen||document.hidden)return
    if(this.last&&now-this.last<1000/32)return
    const ms=this.last?now-this.last:32,dt=Math.min(.12,ms/1000);this.last=now;this.elapsed+=dt
    if(this.quality==='auto'&&this.autoRatio>1&&ms>85){
      if(++this.lowFrames>=12){this.autoRatio=1;this.resize()}
    }
    if(this.focus&&this.eye){
      const blend=1-Math.exp(-dt*4)
      this.controls.target.lerp(this.focus,blend);this.camera.position.lerp(this.eye,blend)
      if(this.focus.distanceToSquared(this.controls.target)<.0001){this.focus=null;this.eye=null}
    }
    this.controls.target.x=T.MathUtils.clamp(this.controls.target.x,-23,24)
    this.controls.target.z=T.MathUtils.clamp(this.controls.target.z,-15,19)
    this.controls.target.y=T.MathUtils.clamp(this.controls.target.y,0,8)
    this.controls.update()
    if(this.mode==='city'){
      const dusk=(1-Math.cos(this.elapsed*.037))*.5
      this.sun.intensity=2.26-dusk*.95;this.ambient.intensity=1.65-dusk*.48
      this.glass.forEach(m=>{(m.material as T.MeshStandardMaterial).emissiveIntensity=.09+dusk*1.45})
      for(const citizen of this.citizens){
        if(citizen.resting>0){citizen.resting-=dt;continue}
        citizen.actor.visible=true
        const dest=citizen.stops[citizen.index],delta=dest.clone().sub(citizen.actor.position),distance=delta.length()
        if(distance<.08){
          const working=citizen.name==='baker'&&citizen.doorStop!==null&&citizen.index===citizen.doorStop
          citizen.atDoor=(citizen.name==='resident'||citizen.name==='nika')&&
            citizen.doorStop!==null&&citizen.index===citizen.doorStop
          citizen.actor.visible=!citizen.atDoor;citizen.resting=working?11:citizen.atDoor?6:2
          citizen.index=(citizen.index+1)%citizen.stops.length
          citizen.legs.forEach(l=>l.rotation.x=0)
        }else{
          citizen.actor.position.addScaledVector(delta,Math.min(distance,dt*.83)/distance)
          citizen.actor.rotation.y=Math.atan2(delta.x,delta.z)
          citizen.legs.forEach((l,i)=>l.rotation.x=Math.sin(this.elapsed*7+i*Math.PI)*.31)
        }
      }
      this.smoke.forEach((puff,i)=>{
        const t=(this.elapsed*.28+i/this.smoke.length)%1
        puff.position.copy(this.chimney!).add(vec(t*.65+Math.sin(t*5)*.09,t*1.72,0));puff.scale.setScalar(.06+Math.sin(t*Math.PI)*.17)
      })
    }else{this.sun.intensity=2.15;this.ambient.intensity=1.76}
    this.renderer.render(this.scene,this.camera)
  }
  dispose(){
    cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose()
    this.renderer.domElement.removeEventListener('pointerdown',this.startPick)
    this.renderer.domElement.removeEventListener('pointerup',this.endPick)
    this.clearObjects();if(this.terrain)disposeGroup(this.terrain)
    this.sun.shadow.dispose();this.renderer.dispose();this.renderer.domElement.remove()
  }
}
