import {stats,weight,canDrop} from '../assembly.js';

export function overloadDetails(s){
 const st=stats(s),inventoryWeight=s.inventory.reduce((sum,p)=>sum+weight(p),0);
 const candidates=s.inventory.filter(p=>canDrop(s,p));
 if(!candidates.length)candidates.push(...[...s.arms,...s.legs,...s.organs].filter(p=>canDrop(s,p)));
 candidates.sort((a,b)=>weight(b)-weight(a)||a.id-b.id);
 return {...st,inventoryWeight,installedWeight:st.weight-inventoryWeight,target:candidates[0]};
}

// Finish unloading before introducing capacity. Once revealed, the second step
// stays visible until the free body upgrade, even if inventory adds weight.
export function overloadGuideStep(s){
 if(!s.overloadGuide)return null;
 if(s.overloadGuideStep==='body'&&!s.overloadBodyUpgradeClaimed)return 'body';
 const details=overloadDetails(s);
 if(details.overloaded&&details.target)return 'item';
 if(s.overloadBodyUpgradeClaimed){s.overloadGuide=false;delete s.overloadGuideStep;return null;}
 s.overloadGuideStep='body';
 return 'body';
}

export function overloadGuideProgress(s,step){
 if(step==='body')return '2/2';
 return s.overloadBodyUpgradeClaimed?'1/1':'1/2';
}

export function createOverloadOnboarding(){
 let previous=false,due=null,shown=false;
 return {update({overloaded,active,blocked,now,guided=false}){
  if(guided){shown=true;due=null;}
  if(!active){due=null;previous=false;return {warning:false,open:false};}
  if(overloaded&&!previous&&!shown)due=now+1500;
  if(!overloaded)due=null;
  previous=overloaded;
  const open=overloaded&&!shown&&due!==null&&now>=due&&!blocked;
  if(open){shown=true;due=null;}
  return {warning:overloaded&&!blocked,open};
 }};
}
