if(review==='boss-families-proof'){
 const {addXP,chooseUpgrade,spawnEnemy}=await import('/src/game.js');
 const {xpRequired}=await import('/src/systems/balance.js');
 const {tickSurvivalBosses,SURVIVAL_BOSS_INTERVAL}=await import('/src/systems/survival-bosses.js');
 const index=Math.max(1,Math.min(5,Number(params.get('boss'))||4)),wave=params.get('family')==='wave',live=params.has('play')&&!wave&&index===4;
 let boss=run.enemies.find(e=>e.habitatRank===index);
 if(wave){run.time=index*SURVIVAL_BOSS_INTERVAL;run.survivalBosses={nextAt:run.time,count:index-1,rotation:[]};boss=tickSurvivalBosses(run,(...args)=>spawnEnemy(run,...args));}
 for(let l=1;l<(wave?4:boss.bossLevel);l++){addXP(run,(xpRequired(run.level)-run.xp)/1.5);chooseUpgrade(run,0);}
 run.nextElite=Infinity;run.waves.credit=-Infinity;run.survivalBosses={nextAt:Infinity,count:0};
 const startTime=run.time;
 for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,x=boss.x+Math.sin(angle)*(boss.radius+3.6),z=boss.z+Math.cos(angle)*(boss.radius+3.6);
  if(run.world.walkable(x,z,2.4)){Object.assign(run.player,{x,z,y:run.world.heightAt(x,z),facing:angle+Math.PI});break;}
 }
 run.events=[];run.health.invulnerableUntil=0;settings.update('language','ru');gameplayActive=true;ui.close();document.body.dataset.screen='';
 const report=document.createElement('script');report.type='application/json';report.id='boss-families-proof';document.body.append(report);
 enemyReview={get paused(){return !live||run.time-startTime>=20;},tick(){
  const dx=run.player.x-boss.x,dz=run.player.z-boss.z,d=Math.hypot(dx,dz)||1,radial=(6.2-d)*1.5;
  Object.assign(movement,{x:dx/d*radial-dz/d,z:dz/d*radial+dx/d});
  const row=e=>({rank:e.habitatRank,level:e.bossLevel,name:e.bossName,hp:e.hp,maxHp:e.maxHp,damage:e.damage,armor:e.armor,speed:e.speed,recipe:e.recipeId,body:e.assembly?.body.key,arms:e.assembly?.arms.filter(Boolean).map(p=>p.key),missionModel:e.bossDesignId||null,missionController:!!e.bossCombat,phase:e.bossCombat?.phase??e.enemyAttack?.phase});
  report.textContent=JSON.stringify({method:live?'Prepared level-24 character on the real survival map; live frame loop and movement; background waves suspended.':'Paused review of the real generated map or timed-wave boss.',family:wave?'wave':'map',time:run.time,level:run.level,hp:run.hp,dead:run.dead,boss:row(boss),habitats:run.enemies.filter(e=>e.habitat).map(row),snapshot:window.bioso.snapshot()});
 }};
}
