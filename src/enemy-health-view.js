import * as T from 'three';
/** Camera-facing bars stay readable above the modular enemy silhouette. */
export function createEnemyHealthView(scene){
 const root=new T.Group();root.name='enemy-health-bars';scene.add(root);
 const geometry=new T.PlaneGeometry(1,1),back=new T.MeshBasicMaterial({color:'#151b19',depthTest:false,depthWrite:false,toneMapped:false}),boss=new T.MeshBasicMaterial({color:'#ed7465',depthTest:false,depthWrite:false,toneMapped:false}),elite=new T.MeshBasicMaterial({color:'#edc56c',depthTest:false,depthWrite:false,toneMapped:false});
 const pool=[];
 function update(enemies,camera,scale=1){
  let count=0;
  for(const e of enemies){if(e.hp<=0||!['boss','final','elite'].includes(e.kind)||!(e.maxHp>0))continue;
   let g=pool[count];if(!g){g=new T.Group();const bg=new T.Mesh(geometry,back),fill=new T.Mesh(geometry,boss);bg.renderOrder=100;fill.renderOrder=101;g.add(bg,fill);root.add(g);pool.push(g);}count++;g.visible=true;
   const width=e.kind==='elite'?3:4.5,ratio=Math.max(0,Math.min(1,e.hp/e.maxHp));
   g.position.set(e.x,(e.y??0)+e.radius*scale*2+.7,e.z);g.quaternion.copy(camera.quaternion);
   const isElite=e.kind==='elite';
   g.children[0].scale.set(width+(isElite?.16:0),isElite?.42:.1,1);g.children[1].material=isElite?elite:boss;g.children[1].scale.set(width*ratio,isElite?.24:.1,1);g.children[1].position.x=-width*(1-ratio)/2;
  }
  for(let i=count;i<pool.length;i++)pool[i].visible=false;
 }
 return {update,reset(){for(const g of pool)g.visible=false;}};
}
