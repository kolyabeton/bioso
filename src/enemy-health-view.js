import * as T from 'three';
const BOSS_NAME_FONT_MAX=48,BOSS_NAME_FONT_MIN=34;
/** Camera-facing bars stay readable above the modular enemy silhouette. */
export function createEnemyHealthView(scene){
 const root=new T.Group();root.name='enemy-health-bars';scene.add(root);
 const geometry=new T.PlaneGeometry(1,1),back=new T.MeshBasicMaterial({color:'#151b19',depthTest:false,depthWrite:false,toneMapped:false}),boss=new T.MeshBasicMaterial({color:'#ed7465',transparent:true,depthTest:false,depthWrite:false,toneMapped:false}),elite=new T.MeshBasicMaterial({color:'#e89a48',transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
 const pool=[];
 function updateBossBadge(group,e,width){
  const key=['boss','final'].includes(e.kind)?`${e.bossLevel||1}|${e.bossName||'Босс'}|${width}`:'';
  if(group.userData.badgeKey===key)return;
  group.userData.badge?.material.map?.dispose();group.userData.badge?.material.dispose();group.userData.badge?.removeFromParent();group.userData.badge=null;group.userData.badgeKey=key;
  if(!key||typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=144;const context=canvas.getContext('2d'),rounded=(x,y,w,h,r)=>{context.beginPath();context.roundRect(x,y,w,h,r);};
  context.shadowColor='#07110c99';context.shadowBlur=8;context.shadowOffsetY=4;context.fillStyle='#30382f';rounded(5,5,758,134,15);context.fill();
  context.shadowColor='transparent';context.shadowBlur=0;context.shadowOffsetY=0;
  const ceramic=context.createLinearGradient(0,10,0,100);ceramic.addColorStop(0,'#eee8d6');ceramic.addColorStop(.55,'#d8d1bd');ceramic.addColorStop(1,'#c6bea8');
  context.fillStyle=ceramic;context.strokeStyle='#8e927f';context.lineWidth=3;rounded(10,10,748,96,11);context.fill();context.stroke();
  context.strokeStyle='#fffdf288';context.lineWidth=2;rounded(14,14,740,87,8);context.stroke();
  context.fillStyle='#26342e';context.strokeStyle='#708071';context.lineWidth=2;rounded(22,23,138,64,8);context.fill();context.stroke();
  const indicator=context.createRadialGradient(39,43,1,42,47,8);indicator.addColorStop(0,'#c8f1d8');indicator.addColorStop(.35,'#6ca88c');indicator.addColorStop(1,'#326d5b');context.fillStyle=indicator;context.beginPath();context.arc(42,55,7,0,Math.PI*2);context.fill();
  context.fillStyle='#f2eddd';context.font='700 27px "Onest", sans-serif';context.textAlign='left';context.textBaseline='middle';context.fillText(`УР. ${e.bossLevel||1}`,58,56);
  context.strokeStyle='#788b7255';context.lineWidth=2;context.beginPath();context.moveTo(178,29);context.lineTo(178,82);context.stroke();
  const name=e.bossName||'Босс',maxNameWidth=548;let fontSize=BOSS_NAME_FONT_MAX;context.font=`650 ${fontSize}px "Onest", sans-serif`;while(fontSize>BOSS_NAME_FONT_MIN&&context.measureText(name).width>maxNameWidth){fontSize--;context.font=`650 ${fontSize}px "Onest", sans-serif`;}
  context.fillStyle='#29332b';context.textAlign='left';context.fillText(name,198,56,maxNameWidth);
  context.fillStyle='#202a25';context.strokeStyle='#8e927f';context.lineWidth=3;rounded(10,99,748,35,8);context.fill();context.stroke();
  context.strokeStyle='#111915';context.lineWidth=2;rounded(17,106,734,21,5);context.stroke();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;const material=new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}),badge=new T.Sprite(material);badge.name='boss-name-badge';badge.renderOrder=99;badge.scale.set(width,1.08,1);group.add(badge);group.userData.badge=badge;
 }
 function update(enemies,camera,scale=1){
  let count=0;
  for(const e of enemies){if(e.hp<=0||!['boss','final','elite','boss-part'].includes(e.kind)||!(e.maxHp>0))continue;
   let g=pool[count];if(!g){g=new T.Group();const bg=new T.Mesh(geometry,back),fill=new T.Mesh(geometry,boss);bg.renderOrder=100;fill.renderOrder=101;g.add(bg,fill);root.add(g);pool.push(g);}count++;g.visible=true;
   const width=e.kind==='boss-part'?1.6:e.kind==='elite'?3:4.5,ratio=Math.max(0,Math.min(1,e.hp/e.maxHp)),isBoss=['boss','final'].includes(e.kind),displayWidth=isBoss?Math.max(width,5.8):width;
   const modelTop=isBoss?(e.presentationHeight??e.visualHeight??e.radius*(e.bossCombat?1.85:scale*2)):e.kind==='boss-part'?1.3:e.radius*scale*1.4+.7;
   g.position.set(e.x,(e.y??0)+modelTop+(isBoss ? .72 : 0),e.z);g.quaternion.copy(camera.quaternion);
   const isElite=e.kind==='elite',barWidth=isBoss?displayWidth*(734/768):width;
   g.children[0].visible=!isBoss;g.children[0].position.y=0;g.children[0].scale.set(width,.1,1);
   g.children[1].material=isElite?elite:boss;g.children[1].position.y=isBoss?-.34:0;g.children[1].scale.set(barWidth*ratio,isBoss ? .14 : .1,1);g.children[1].position.x=-barWidth*(1-ratio)/2;updateBossBadge(g,e,displayWidth);
  }
  for(let i=count;i<pool.length;i++)pool[i].visible=false;
 }
 return {update,reset(){for(const g of pool)g.visible=false;}};
}
