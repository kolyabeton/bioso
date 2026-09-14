import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {stageDungeonReview} from '../src/dungeon-review-state.js';
import {movePlayer,bodyRadius} from '../src/elevation.js';
import {dungeonDressing} from '../src/dungeon-dressing.js';
import {dungeonRouteDistance,dungeonSurfaceDistance} from '../src/dungeon-layout.js';
import {BODIES} from '../src/catalog.js';
import {bodySize} from '../src/body-size.js';
import {Scene} from 'three';
import {createMissionEnvironmentView} from '../src/mission-environment-view.js';

for(const key of ['roots','catacombs']){
 test(`${key}: largest body traverses every branch both ways and backs away from edges`,()=>{
  const s=createWorldRun(undefined,'survival',20317),n=stageDungeonReview(s,key),graph=n.tunnelGraph;
  const largest=Object.keys(BODIES).map(key=>({key,tier:5})).sort((a,b)=>bodySize(b).radius-bodySize(a).radius)[0];
  s.body={...s.body,...largest};assert(bodyRadius(s)>1.8);
  // The exit is now a solid building; its approach remains within 4 m.
  const approach=p=>p.id===graph.entrance?{...p,z:p.z-3.8}:p;
  const walkTo=target=>{
   for(let i=0;i<800;i++){
    const dx=target.x-s.player.x,dz=target.z-s.player.z,d=Math.hypot(dx,dz);
    if(d<.04)return;
    const stride=Math.min(.15,d);movePlayer(s,.025,dx/d*stride,dz/d*stride);
   }
   assert.fail(`blocked at ${JSON.stringify(s.player)} toward ${JSON.stringify(target)}`);
  };
  for(const edge of graph.edges)for(const direction of [1,-1])for(const offset of [-1.2,0,1.2]){
   const a=approach(graph.nodes[direction===1?edge.from:edge.to]),b=approach(graph.nodes[direction===1?edge.to:edge.from]);
   const length=Math.hypot(b.x-a.x,b.z-a.z),nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length;
   Object.assign(s.player,{x:a.x+nx*offset,z:a.z+nz*offset});
   walkTo({x:b.x+nx*offset,z:b.z+nz*offset});
   // Push against the outer edge, then return using the actual movement code.
   movePlayer(s,.025,nx*8,nz*8);
   assert(s.world.walkable(s.player.x,s.player.z,bodyRadius(s)));
   walkTo(b);
  }
  // Take every incoming/outgoing turn without resetting at the junction.
  for(const original of graph.nodes){
   const node=approach(original);
   const neighbors=graph.edges.filter(e=>e.from===node.id||e.to===node.id).map(e=>graph.nodes[e.from===node.id?e.to:e.from]);
   const along=q=>{const d=Math.hypot(q.x-node.x,q.z-node.z);return{x:node.x+(q.x-node.x)/d*6,z:node.z+(q.z-node.z)/d*6};};
   for(const incoming of neighbors)for(const outgoing of neighbors){Object.assign(s.player,along(incoming));walkTo(node);walkTo(along(outgoing));}
  }
 });
 test(`${key}: mission scenery leaves the full central lane clear`,()=>{
  const s=createWorldRun(undefined,'survival',20317),n=stageDungeonReview(s,key),props=dungeonDressing(n.tunnelGraph,n.type);
  assert(props.length>=65,'the network has regular scenery throughout');
  assert(props.filter(p=>p.large).length>=2,'ruins punctuate the tunnel network');
  assert(props.some(p=>p.model.includes('boulder')));assert(props.some(p=>p.model.includes('shrub')));
  for(const p of props){
   assert(dungeonRouteDistance(n.tunnelGraph,p)-p.radius>=3.28,'scenery stays outside the central 6.6 m lane');
   assert.notEqual(s.world.heightAt(p.x,p.z),null,'scenery lies on the sampled mission terrain');
   assert.equal(s.world.heightAt(p.x,p.z),0,'the technical deck is level below every object');
   for(let i=0;i<36;i++){
    const angle=i*Math.PI/18,edge={x:p.x+Math.cos(angle)*p.radius,z:p.z+Math.sin(angle)*p.radius};
    assert(dungeonSurfaceDistance(n.tunnelGraph,edge)<-.45,'the complete rotated model footprint has a deck below it');
   }
   for(let i=0;i<=12;i++)assert(dungeonSurfaceDistance(n.tunnelGraph,{x:p.groundX+(p.x-p.groundX)*i/12,z:p.groundZ+(p.z-p.groundZ)*i/12})<0,'each scenery bay connects to its corridor');
  }
  const scene=new Scene(),view=createMissionEnvironmentView(scene,{load:()=>assert.fail('dungeons must not request mission fences or gates')});
  view.update(s);
  assert.equal(scene.getObjectByName('mission-fences').visible,false,'legacy straight mission walls must not cut across dungeon branches');
  view.dispose();
 });
}
