// Upload one texture per shared preparation job instead of paying for every map
// in the first visible draw. Renderer and texture lifetimes remain weakly held.
const prepared=new WeakMap();
export async function prepareTextures(renderer,textures,work){
 if(!renderer?.initTexture)return;
 let cache=prepared.get(renderer);if(!cache)prepared.set(renderer,cache=new WeakMap());
 for(const texture of textures){
  if(!texture?.isTexture)continue;
  const version=texture.version;let entry=cache.get(texture);
  if(entry&&entry.version===version){
   try{await entry.promise;continue;}
   catch{ // A shared upload may have belonged to a tile that was cancelled.
    // Retry under this caller's validity guard instead of failing a live tile.
    await prepareTextures(renderer,[texture],work);continue;
   }
  }
  if(!entry||entry.version!==version){
   entry={version,promise:null};cache.set(texture,entry);
   entry.promise=work(Object.assign(()=>renderer.initTexture(texture),{workLabel:'texture-upload:'+texture.name})).catch(error=>{if(cache.get(texture)===entry)cache.delete(texture);throw error;});
  }
  await entry.promise;
 }
}
export function materialTextures(material){return (Array.isArray(material)?material:[material]).flatMap(m=>Object.values(m).filter(value=>value?.isTexture));}
