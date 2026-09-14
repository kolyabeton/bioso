// Only the final, most informative sound survives a synchronous UI action.
const PRIORITY={click:0,open:1,close:1,pickup:2,confirm:3,organic:4,mechanical:4,deny:5};
export function createAudioFeedback(play,schedule=queueMicrotask){
  let pending=null;
  return function feedback(cue='click'){
    if(!(cue in PRIORITY))return;
    if(pending===null)schedule(()=>{const chosen=pending;pending=null;play(chosen);});
    if(pending===null||PRIORITY[cue]>=PRIORITY[pending])pending=cue;
  };
}
export const installationSound=kind=>['body','organ'].includes(kind)?'organic':'mechanical';
export const createOperationFeedback=(getState,feedback)=>(operation,cue)=>(state,...args)=>{
  const selected=typeof cue==='function'?cue(state,...args):cue;
  const result=operation(state,...args);
  if(state===getState())feedback(result===false?'deny':selected);
  return result;
};
