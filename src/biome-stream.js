/** Rendering residency only. Never removes simulation entities or discovery. */
export class BiomeStream {
 constructor(load,release){this.load=load;this.release=release;this.entries=new Map();this.generation=0;}
 update(ids){const wanted=new Set(ids);for(const [id,e]of this.entries)if(!wanted.has(id)){this.entries.delete(id);if(e.value)this.release(e.value);}
  for(const id of wanted)if(!this.entries.has(id)){const e={status:'loading'};this.entries.set(id,e);Promise.resolve().then(()=>this.load(id)).then(value=>{if(this.entries.get(id)!==e){this.release(value);return;}e.value=value;e.status='ready';},error=>{if(this.entries.get(id)===e){e.status='error';e.error=String(error);}});}
 }
 retry(){for(const [id,e]of this.entries)if(e.status==='error')this.entries.delete(id);}
 get ready(){return new Set([...this.entries].filter(([,e])=>e.status==='ready').map(([id])=>id));}
 reset(){for(const e of this.entries.values())if(e.value)this.release(e.value);this.entries.clear();}
}
