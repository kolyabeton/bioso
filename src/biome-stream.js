/** Rendering residency only. Never removes simulation entities or discovery. */
export class BiomeStream {
 constructor(load,release){this.load=load;this.release=release;this.entries=new Map();this.generation=0;this.active=0;this.readyIds=new Set();this.wanted=new Set();}
 update(ids){const wanted=new Set(ids);this.wanted=wanted;
  // Keep the previous ready ring while the next ring is being prepared. On a
  // phone a terrain build can span several frames; releasing it immediately
  // exposes the clear colour as white slivers at the edge of the camera.
  for(const [id,e]of this.entries)if(!wanted.has(id))e.stale=true;
  for(const id of wanted){const entry=this.entries.get(id);if(entry)entry.stale=false;else this.entries.set(id,{status:'queued'});}
  this.order=ids;this.drain();this.releaseReadyStale();
 }
 releaseReadyStale(){
  if([...this.wanted].some(id=>this.entries.get(id)?.status!=='ready'))return;
  for(const [id,e]of this.entries)if(e.stale){this.entries.delete(id);this.readyIds.delete(id);if(e.value)this.release(e.value);}
 }
 drain(){for(const id of this.order||[]){if(this.active>=2)break;const e=this.entries.get(id);if(e?.status!=='queued')continue;
  e.status='loading';this.active++;const valid=()=>this.entries.get(id)===e;
  Promise.resolve().then(()=>this.load(id,{valid})).then(value=>{if(!valid()){this.release(value);return;}e.value=value;e.status='ready';this.readyIds.add(id);this.releaseReadyStale();},error=>{if(valid()){e.status='error';e.error=String(error);}}).finally(()=>{this.active--;this.drain();});
 }}
 retry(){for(const [id,e]of this.entries)if(e.status==='error')this.entries.delete(id);}
 get ready(){return this.readyIds;}
 reset(){this.generation++;for(const e of this.entries.values())if(e.value)this.release(e.value);this.entries.clear();this.readyIds.clear();this.order=[];this.wanted.clear();}
}
