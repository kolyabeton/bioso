import {toCanvas} from '/temp/trailer-dom/package/es/index.js';
export function installUiCapture(name,status){
 let requested=false,busy=false,count=0;
 window.addEventListener('paste',async e=>{
  const file=[...e.clipboardData.items].find(x=>x.type==='image/png')?.getAsFile();if(!file)return;e.preventDefault();
  const label=name+'-'+String.fromCharCode(97+count++),panel=document.querySelector('#panel');
  await fetch('/__trailer/'+label+'.png',{method:'POST',body:file});
  await fetch('/__trailer/'+label+'.json',{method:'POST',body:JSON.stringify({route:location.href,screen:panel.dataset.screen,viewport:{width:innerWidth,height:innerHeight},panel:panel.getBoundingClientRect().toJSON(),text:panel.innerText,method:'Exact native IAB screenshot of actual live UI, transferred locally through browser clipboard.'},null,2)});
  document.body.dataset.trailerSaved=label;
 });
 window.addEventListener('keydown',e=>{if(e.code==='F8'){e.preventDefault();requested=true;}});
 return async()=>{
  if(!requested||busy)return;requested=false;busy=true;
  try{
   await document.fonts.ready;
   const out=document.createElement('canvas');out.width=innerWidth;out.height=innerHeight;const c=out.getContext('2d'),world=document.querySelector('#world'),r=world.getBoundingClientRect();
   c.fillStyle='#191f1a';c.fillRect(0,0,out.width,out.height);c.drawImage(world,r.x,r.y,r.width,r.height);
   const panel=document.querySelector('#panel');
   if(panel.open){const b=panel.getBoundingClientRect();c.fillStyle='#121712b8';c.fillRect(0,0,out.width,out.height);const img=await toCanvas(panel,{pixelRatio:1,skipAutoScale:true,style:{margin:'0',left:'0',top:'0',transform:'none'}});c.drawImage(img,b.x,b.y,b.width,b.height);}
   const label=name+'-'+String.fromCharCode(97+count++);const blob=await new Promise(resolve=>out.toBlob(resolve));
   const response=await fetch('/__trailer/'+label+'.png',{method:'POST',body:blob});if(!response.ok)throw Error(await response.text());
   status.textContent='Saved '+label;
   const proof={route:location.href,screen:panel.dataset.screen,viewport:{width:innerWidth,height:innerHeight},panel:panel.getBoundingClientRect().toJSON(),text:panel.innerText,method:'Raster capture of actual DOM, real game canvases, shipped CSS, fonts and assets; F8 after real UI interaction.'};
   await fetch('/__trailer/'+label+'.json',{method:'POST',body:JSON.stringify(proof,null,2)});
  }catch(e){status.textContent='UI capture: '+e.message;console.error(e);}finally{busy=false;}
 };
}
