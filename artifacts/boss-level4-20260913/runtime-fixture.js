if(review==='level-four-proof'){
 const {addXP,chooseUpgrade}=await import('/src/game.js');
 const {xpRequired}=await import('/src/systems/balance.js');
 for(let l=1;l<4;l++){addXP(run,(xpRequired(run.level)-run.xp)/1.5);chooseUpgrade(run,0);}
 const boss=run.enemies.find(e=>e.habitat&&e.bossLevel===4);
 run.nextElite=Infinity;run.waves.credit=-Infinity;run.survivalBosses={nextAt:Infinity,count:0};
 for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,x=boss.x+Math.sin(angle)*7,z=boss.z+Math.cos(angle)*7;
  if(run.world.walkable(x,z,2.4)){Object.assign(run.player,{x,z,y:run.world.heightAt(x,z),facing:angle+Math.PI});break;}
 }
 run.events=[];run.health.invulnerableUntil=0;settings.update('language','ru');gameplayActive=true;ui.close();
 document.body.dataset.screen='';
 const report=document.createElement('script');report.type='application/json';report.id='level-four-proof';document.body.append(report);
 enemyReview={get paused(){return run.time>=20;},tick(){
  const dx=run.player.x-boss.x,dz=run.player.z-boss.z,d=Math.hypot(dx,dz)||1,radial=(6.2-d)*1.5;
  Object.assign(movement,{x:dx/d*radial-dz/d,z:dz/d*radial+dx/d});
  report.textContent=JSON.stringify({method:'Prepared level-four character on the real survival map; live frame loop and movement; background waves suspended for this duel.',level:run.level,time:run.time,hp:run.hp,dead:run.dead,boss:{name:boss.bossName,hp:boss.hp,maxHp:boss.maxHp,damage:boss.damage,phase:boss.bossCombat.phase,actions:boss.bossCombat.counts},snapshot:window.bioso.snapshot()});
 }};
}
