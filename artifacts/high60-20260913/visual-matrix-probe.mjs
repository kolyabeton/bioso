import * as T from 'three';
import {createEnemyAssemblyView as oldView} from './enemy-view-reference.mjs';
import {createEnemyAssemblyView as newView} from '../../src/enemy-assembly-view.js';
import {ENEMY_RECIPES,assembleEnemy} from '../../src/systems/enemy-assembly.js';
const template=new T.Group(),geometry=new T.BoxGeometry(.7,2,1.3),material=new T.MeshStandardMaterial();
const child=new T.Mesh(geometry,material);child.position.set(.1,.3,-.2);child.rotation.z=.1;template.add(child);
const player={x:0,z:0};let comparisons=0,maxError=0;
for(const r of ENEMY_RECIPES)for(const kind of ['normal','elite'])for(const tier of [1,3,5]){
 const sceneA=new T.Scene(),sceneB=new T.Scene(),a=oldView(sceneA,{load:async()=>template}),b=newView(sceneB,{load:async()=>template});
 const e={id:42,x:5,z:8,hp:100,kind,tier,radius:.8,recipeId:r.id,role:r.role,specialty:r.specialty,flying:r.role==='flying',assembly:assembleEnemy(r,tier,kind)};
 a.update([e],player,0);b.update([e],player,0);await Promise.resolve();
 for(const summon of [false,true])for(const time of [.1,.7,1.9,3]){
  e.summonAssembly=summon?{started:0,until:2,speed:1}:null;e.specialAttack={kind:'puppeteer',started:0,at:3};
  a.update([e],player,time);b.update([e],player,time);
  const x=sceneA.children[0].children.filter(p=>p.count),y=sceneB.children[0].children.filter(p=>p.count);
  if(x.length!==y.length)throw Error('pool mismatch '+r.id);
  for(let i=0;i<x.length;i++){
   if(x[i].count!==y[i].count)throw Error('instance mismatch '+r.id);
   for(let j=0;j<x[i].count*16;j++){
    const error=Math.abs(x[i].instanceMatrix.array[j]-y[i].instanceMatrix.array[j]);maxError=Math.max(maxError,error);comparisons++;
    if(error>1e-5)throw Error(JSON.stringify({recipe:r.id,kind,tier,summon,time,pool:i,element:j,error}));
   }
  }
 }
 a.dispose();b.dispose();
}
console.log(JSON.stringify({comparisons,maxError,passed:true}));
