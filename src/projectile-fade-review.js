// DEV-only deterministic presentation route using the production game renderers.
export function prepareProjectileFadeReview(run,params,clock=()=>performance.now()){
 run.enemies=[];run.shots=[];run.hostileShots=[];run.arms=[];
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;top:70px;left:12px;z-index:90;background:#17201eee;color:#fff;padding:10px;font:12px sans-serif';
 const label=document.createElement('output');panel.append(label);
 let fixed=params.has('age')?Number(params.get('age')):null;
 for(const [title,life] of [['Flight',0],['Body fading',.05],['Trace only',.18],['Gone',.3],['Play',null]]){const button=document.createElement('button');button.textContent=title;button.onclick=()=>fixed=life;panel.append(button);}document.body.append(panel);
 const started=clock();
 return{paused:true,tick(){
  const elapsed=(clock()-started)/1000,phase=elapsed%1.8,life=fixed!=null?1:Math.max(0,1.2-phase),p=run.player,y=(p.y??0)+1.8;run.time=elapsed;
  label.textContent=fixed!=null?`Crimsonland-style · after stop ${fixed.toFixed(2)} s `:`Crimsonland-style · ${life>0?'flight':'afterglow'} `;
  const shot=(id,x,z,key)=>({id,x:p.x+x+(fixed!=null?0:Math.min(1.2,phase)*2-1.2),y,z:p.z+z,dx:1,dy:0,dz:0,travel:4,life,...(fixed!=null?{presentationAge:fixed}:{}),mode:'projectile',w:{key},hit:new Set()});
  run.shots=life>0?['seed','needle','acid','harpoon'].map((key,i)=>shot(i+1,-4+i*2.6,3,key)):[];
  if(life>0)run.shots.push({...shot(5,4,6,'seed'),meleeRicochet:true});
  run.hostileShots=life>0?['seed','needle','legacy'].map((key,i)=>({...shot(20+i,-4+i*2.6,6,key),key,kind:key==='legacy'?'boss':'normal'})):[];
  run.abilities.summonShots=life>0?[{...shot(40,-3,0,'seed'),y:y-1.1,delay:0}]:[];
 }};
}
