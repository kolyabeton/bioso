// Pointer transport delegates validated installation and removal to the screen.
export function bindAssemblyDrag(root,{active,kind,drop,remove}){
 let drag=null,suppress=false;
 root.addEventListener('pointerdown',event=>{
  const source=event.target.closest('[data-drag-source]');
  if(!active()||!source||event.button!==0)return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,data:{...source.dataset},source,started:false};


 });
 root.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  if(!drag.started&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
  if(!drag.started){root.setPointerCapture(event.pointerId);drag.started=true;drag.ghost=drag.source.cloneNode(true);drag.ghost.classList.add('ui-drag-ghost');drag.ghost.removeAttribute('id');root.append(drag.ghost);
   for(const slot of root.querySelectorAll('[data-drop-group]')){const fits=!drag.data.group&&slot.dataset.dropGroup===kind(Number(drag.data.id));slot.classList.toggle('is-compatible',fits);slot.classList.toggle('is-incompatible',!fits);}
   root.querySelector('[data-drop-inventory]')?.classList.toggle('is-compatible',!!drag.data.group);
  }
  for(const el of root.querySelectorAll('.is-drop-hover'))el.classList.remove('is-drop-hover');
  const over=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop-group]');
  if(over?.classList.contains('is-compatible'))over.classList.add('is-drop-hover');
  event.preventDefault();Object.assign(drag.ghost.style,{left:event.clientX+'px',top:event.clientY+'px'});
 });
 function clear(){drag?.ghost?.remove();for(const el of root.querySelectorAll('.is-compatible,.is-incompatible,.is-drop-hover'))el.classList.remove('is-compatible','is-incompatible','is-drop-hover');drag=null;}
 root.addEventListener('pointerup',event=>{
  if(!drag)return;const current=drag,hit=document.elementFromPoint(event.clientX,event.clientY);clear();
  if(!current.started)return;suppress=true;setTimeout(()=>{suppress=false;},0);
  if(current.data.group){if(hit?.closest('[data-drop-inventory]'))remove({id:Number(current.data.id),group:current.data.group,slot:current.data.slot});}
  else{const slot=hit?.closest('[data-drop-group]');if(slot)drop(Number(current.data.id),slot.dataset.dropGroup,Number(slot.dataset.dropSlot));}
 });
 root.addEventListener('pointercancel',clear);
 root.addEventListener('lostpointercapture',()=>{if(drag)clear();});
 root.addEventListener('click',event=>{if(suppress){event.preventDefault();event.stopImmediatePropagation();}},true);
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){clear();event.preventDefault();}});
}
