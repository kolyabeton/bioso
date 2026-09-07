import * as T from 'three';
import {makeArm,geo,materials} from './kit.js';

// One transient context renders real equipment into static HUD thumbnails.
export function renderModuleIcons(){
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(160,140);renderer.setPixelRatio(1);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff4d6','#4d6553',2));
  const light=new T.DirectionalLight('#ffdda4',3);light.position.set(-3,5,4);scene.add(light);
  const camera=new T.OrthographicCamera(-1.05,1.05,.92,-.92,.1,30);camera.position.set(2,3.5,4);camera.lookAt(0,0,0);
  for(const image of document.querySelectorAll('[data-icon]')){
    const part=image.dataset.icon;let model;
    if(part==='core'){
      model=new T.Group();const shell=new T.Mesh(geo.joint,materials.dark);shell.scale.setScalar(.56);model.add(shell);
      const rim=new T.Mesh(geo.ring,materials.amber);rim.scale.setScalar(.48);model.add(rim);
      const core=new T.Mesh(geo.shell,materials.cyan);core.scale.set(.3,.3,.4);core.position.set(0,.2,.3);model.add(core);rim.position.z=.39;
    }else model=makeArm(part);
    const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3());model.position.sub(center);model.rotation.z=-.35;scene.add(model);
    renderer.render(scene,camera);image.src=renderer.domElement.toDataURL('image/png');scene.remove(model);
  }
  renderer.dispose();renderer.forceContextLoss();
}
