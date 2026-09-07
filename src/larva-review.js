// Close-up of the very same instanced models used by createIsaacView.
import * as T from 'three';
import {createLarvaView} from './systems/larva-view.js';
const canvas=document.querySelector('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#202a26');scene.add(new T.HemisphereLight(0xc5e2df,0x27271f,2));
const key=new T.DirectionalLight(0xffe4bb,4);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});key.shadow.normalBias=.015;scene.add(key);const fill=new T.DirectionalLight(0x98c9c4,1.5);fill.position.set(4,2,-3);scene.add(fill);
const camera=new T.PerspectiveCamera(32,1,.1,30);camera.position.set(4,5.44,6.08);camera.lookAt(0,.1,-.1);
const view=createLarvaView(scene),s={time:0,isaac:{larvae:[{id:1,x:-.45,y:0,z:.35,prepare:0},{id:2,x:.45,y:0,z:-.4,prepare:.35}]}};
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x28312b,roughness:1}));floor.receiveShadow=true;floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let then=performance.now();
function frame(now){const dt=Math.min(.05,(now-then)/1000);then=now;s.time+=dt;const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();view.update(s,reduced.matches);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
