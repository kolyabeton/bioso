// Read-only isolation check: disables only this task's new cadence in memory.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(!url.endsWith('/src/systems/survival-cadence.js'))return result;
 return {...result,source:String(result.source).replace('export function survivalCadenceAt(time){','export function survivalCadenceAt(time){return null;')};
}
