// DEV-only looping proof of the successful-dodge presentation contract.
export function prepareDodgeVfxReview(run,emit,clock=()=>performance.now()){
 run.enemies=[];run.hostileShots=[];run.waves.credit=-1e6;run.nextElite=run.waves.nextElite=1e9;run.nextBoss=run.waves.nextBoss=1e9;
 let next=0;
 return{paused:false,tick(){const now=clock();if(now<next)return;emit({type:'dodge',x:run.player.x,y:run.player.y??0,z:run.player.z,dx:.707,dz:-.707});next=now+300;}};
}
