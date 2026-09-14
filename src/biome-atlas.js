// Create all four UV windows before the first upload. Texture.clone() increments
// the shared Source version; cloning again per tile would re-upload the atlas.
export function createBiomeAtlasViews(texture){
 return Array.from({length:4},(_,index)=>{
  const view=texture.clone();view.repeat.set(.5,.5);view.offset.set(index%2*.5,index<2?.5:0);return view;
 });
}
