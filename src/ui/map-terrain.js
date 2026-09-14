import {BIOMES,TERRAIN_ASSETS} from '../biome-world.js';
import {translateText} from '../i18n/index.js';

const PALETTE={gardens:'#d1d7b9',forest:'#b5c7a5',city:'#dddcd0',scrapyard:'#d1c4ac'};
const NAMES={gardens:'САДЫ',forest:'ЛЕС',city:'ГОРОД',scrapyard:'СВАЛКА'};
/** The same world coordinates are used for terrain, pins, aggro and hit targets. */
export function atlasGeometry(s,w,h,zoom='world'){
 const b=s.world.bounds,near=zoom==='near',spanX=b.maxX-b.minX,spanZ=b.maxZ-b.minZ;
 const sourceX=near?100:spanX,sourceZ=near?100:spanZ,contained=Math.min((w-40)/sourceX,(h-48)/sourceZ);
 const scaleX=contained,scaleZ=contained,scale=contained;
 const center=near?s.player:{x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2};
 return {w,h,scale,scaleX,scaleZ,X:x=>w/2+(x-center.x)*scaleX,Z:z=>h/2+(z-center.z)*scaleZ,center,worldAt:(x,z)=>({x:center.x+(x-w/2)/scaleX,z:center.z+(z-h/2)/scaleZ})};
}
/** No illustrative obstacles: each footprint belongs to a real world decoration. */
export function terrainFootprints(world){return world.tiles.flatMap(t=>t.decorations.map(d=>({...d,tileId:t.id})));}
let groundImage;
export function loadAtlasGround(redraw){
 if(typeof Image==='undefined')return;
 if(!groundImage){groundImage=new Image();groundImage.src=TERRAIN_ASSETS.ground;}
 if(groundImage.complete&&groundImage.naturalWidth){redraw();return;}
 groundImage.addEventListener('load',redraw,{once:true});
 return ()=>groundImage.removeEventListener('load',redraw);
}
function disk(c,x,z,r){c.beginPath();c.arc(x,z,r,0,Math.PI*2);}
export function paintAtlasTerrain(c,s,g,language){
 const {w,h,scale,scaleX=scale,scaleZ=scale,X,Z}=g,b=s.world.bounds;
 c.fillStyle='#e5e4d9';c.fillRect(0,0,w,h);
 c.save();c.beginPath();c.rect(16,18,w-32,h-36);c.clip();
 // Ground patches use the real biome assignment and height sampler.
 for(const t of s.world.tiles){
  const x=X(t.x-32),z=Z(t.z-32),tileWidth=64*scaleX,tileHeight=64*scaleZ;
  c.fillStyle=PALETTE[t.biome];c.fillRect(x,z,tileWidth+.3,tileHeight+.3);
  if(groundImage?.complete&&groundImage.naturalWidth){
   const i=BIOMES.find(b=>b.id===t.biome).atlas,sw=groundImage.naturalWidth/2,sh=groundImage.naturalHeight/2;
   c.save();c.globalAlpha=.3;
   for(let row=0;row<3;row++)for(let col=0;col<3;col++)c.drawImage(groundImage,i%2*sw,Math.floor(i/2)*sh,sw,sh,x+col*tileWidth/3,z+row*tileHeight/3,tileWidth/3+.2,tileHeight/3+.2);
   c.restore();
  }
  // Sample the live surface instead of inventing hills or ravines.
  for(let dz=-32;dz<32;dz+=4)for(let dx=-32;dx<32;dx+=4){
   const y=s.world.heightAt(t.x+dx+2,t.z+dz+2);
   if(y===null){c.fillStyle='#efeee5';c.fillRect(X(t.x+dx),Z(t.z+dz),4*scaleX+.1,4*scaleZ+.1);}
   else if(y>0){c.fillStyle=`rgba(255,255,241,${Math.min(.4,y*.035)})`;c.fillRect(X(t.x+dx),Z(t.z+dz),4*scaleX+.1,4*scaleZ+.1);}
  }
 }
 for(const d of terrainFootprints(s.world)){
  const x=X(d.x),z=Z(d.z),r=d.radius*scale;
  if(x+r<16||x-r>w-16||z+r<18||z-r>h-18)continue;
  c.save();c.translate(x,z);c.rotate(d.rotation||0);c.scale(scaleX/scale,scaleZ/scale);
  c.fillStyle='#57634b25';disk(c,1,1,r);c.fill();
  if(d.feature==='thicket'){
   // Canopy bounded by the actual collision radius, with a light upper edge.
   c.fillStyle='#879a70';disk(c,0,0,r);c.fill();
   c.fillStyle='#adba8c';for(let j=0;j<4;j++){const a=j*Math.PI/2;disk(c,Math.cos(a)*r*.36,Math.sin(a)*r*.36,r*.53);c.fill();}
   c.fillStyle='#c6cfa5';disk(c,-r*.15,-r*.2,r*.4);c.fill();
  }else if(d.feature==='rock'){
   c.beginPath();for(let j=0;j<7;j++){const a=j*Math.PI*2/7,rr=r*(j%2?.85:1);c[j?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fillStyle='#b3b5a7';c.fill();c.strokeStyle='#939c8b';c.lineWidth=.6;c.stroke();c.beginPath();c.moveTo(-r*.6,0);c.lineTo(0,-r*.55);c.lineTo(r*.6,-r*.25);c.strokeStyle='#ecebdc';c.stroke();
  }else{
   const size=Math.min(d.size||r/scale*1.4,d.radius*1.4)*scale;
   c.fillStyle='#f1efdc';c.strokeStyle='#7e8978';c.lineWidth=.8;
   if(/cistern|pillar|turbine/.test(d.model||'')){disk(c,0,0,r*.75);c.fill();c.stroke();disk(c,0,0,r*.38);c.stroke();}
   else{c.fillRect(-size/2,-size/2,size,size);c.strokeRect(-size/2,-size/2,size,size);c.strokeStyle='#b0b7a0';c.beginPath();c.moveTo(-size/2,0);c.lineTo(size/2,0);c.stroke();}
  }
  c.restore();
 }
 // Muted surveying overlay keeps unexplored terrain light and legible.
 for(const t of s.world.tiles)if(!s.exploration.visited.has(t.id)){c.fillStyle='#faf8ec20';c.fillRect(X(t.x-32),Z(t.z-32),64*scaleX,64*scaleZ);}
 c.strokeStyle='#59665060';c.lineWidth=1;c.strokeRect(X(b.minX),Z(b.minZ),(b.maxX-b.minX)*scaleX,(b.maxZ-b.minZ)*scaleZ);
 c.restore();
 // Labels anchor to actual biome tiles, not invented quarter-map geography.
 c.font='600 10px "Onest", sans-serif';c.textAlign='center';c.textBaseline='middle';
 for(const biome of BIOMES){
  const tiles=s.world.tiles.filter(t=>t.biome===biome.id&&t.kind!=='transition');
  const visible=tiles.filter(t=>X(t.x)>45&&X(t.x)<w-45&&Z(t.z)>32&&Z(t.z)<h-44);
  const tile=visible[Math.floor(visible.length/2)];if(!tile)continue;
  const x=X(tile.x),z=Z(tile.z+19),label=translateText(NAMES[biome.id],language),width=c.measureText(label).width+16;
  if(Math.hypot(x-X(s.player.x),z-Z(s.player.z))<30)continue;
  c.fillStyle='#f3f1e6e8';c.fillRect(x-width/2,z-9,width,18);c.fillStyle='#445440';c.fillText(label,x,z);
 }
 c.textBaseline='alphabetic';c.fillStyle='#63745f';c.font='9px "Onest", sans-serif';
 for(let i=0;i<5;i++){
  const x=X(b.minX+(i+.5)*(b.maxX-b.minX)/5),z=Z(b.minZ+(i+.5)*(b.maxZ-b.minZ)/5);
  if(x>22&&x<w-22)c.fillText(String.fromCharCode(65+i),x,12);
  if(z>25&&z<h-25){c.textAlign='left';c.fillText(String(i+1).padStart(2,'0'),2,z+3);c.textAlign='center';}
 }
 const metres=scaleX>1.8?10:50,bar=metres*scaleX;
 c.strokeStyle='#5c6c56';c.lineWidth=1;c.beginPath();c.moveTo(26,h-15);c.lineTo(26+bar,h-15);c.moveTo(26,h-18);c.lineTo(26,h-12);c.moveTo(26+bar,h-18);c.lineTo(26+bar,h-12);c.stroke();c.textAlign='left';c.fillText(translateText(metres+' м',language),31+bar,h-12);
}
