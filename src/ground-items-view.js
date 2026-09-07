import * as T from 'three';
import {loadModel,fittedModel,partModelId,retireModel} from './asset-models.js';
import {createInteractionHighlight} from './vfx/interaction-highlight.js';

export function createGroundItemsView(scene,load=loadModel){
 const active=new Map();
 function remove(id,g){g.userData.highlight.dispose();retireModel(g);scene.remove(g);active.delete(id);}
 function update(items,scale=1,time=0,reducedMotion=false){
  const keep=new Set(items.map(q=>q.id));
  for(const [id,g] of active)if(!keep.has(id))remove(id,g);
  for(const q of items){
   let g=active.get(q.id);
   if(!g){
    g=new T.Group();g.name='ground-item:'+q.part.id;g.userData.partId=q.part.id;
    g.userData.highlight=createInteractionHighlight(g,{radius:1.2,height:1.5});
    const id=partModelId(q.part);g.userData.assetId=id;active.set(q.id,g);scene.add(g);
    load(id).then(template=>{if(!template||g.userData.retired)return;
     const model=fittedModel(template,{size:1.5,anchor:'bottom'});g.add(model);g.userData.highlight.setModel(model);
    });
   }
   g.position.set(q.x,(q.y??0)+.04,q.z);g.scale.setScalar(scale);
   g.userData.highlight.update({time,reducedMotion});
  }
 }
 function reset(){for(const [id,g] of active)remove(id,g);}
 return {update,reset};
}
