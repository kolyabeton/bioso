import * as T from 'three';
import {createEnemyAssemblyView} from '../src/enemy-assembly-view.js';
import {ENEMY_RECIPES,assembleEnemy} from '../src/systems/enemy-assembly.js';

// Accelerated render-update probe, not a real-time gameplay/FPS acceptance run.
const template=new T.Group(),geometry=new T.BoxGeometry(1,2,1),material=new T.MeshStandardMaterial();
template.add(new T.Mesh(geometry,material));
const enemy={id:1,kind:'normal',hp:10,tier:3,flying:true,role:'flying',radius:.6,x:0,z:3,assembly:assembleEnemy(ENEMY_RECIPES.find(r=>r.role==='flying'),3)};
const view=createEnemyAssemblyView(new T.Scene(),{load:async()=>template});
view.update([enemy],{x:0,z:0},0);await Promise.resolve();
const checkpoints=[],started=performance.now();
for(let frame=0;frame<=36000;frame++){
 view.update([enemy],{x:0,z:0},frame/30);
 if(frame%9000===0)checkpoints.push({seconds:frame/30,...view.info(),heapMiB:+(process.memoryUsage().heapUsed/1048576).toFixed(1)});
}
console.log(JSON.stringify({method:'One loaded flying enemy; 36,001 render updates spanning 20 animation minutes at 30 Hz. Shared box template, no GPU or gameplay.',elapsedMs:Math.round(performance.now()-started),checkpoints},null,2));
view.dispose();geometry.dispose();material.dispose();
