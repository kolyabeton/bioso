import {createServer} from 'vite';
const fixture=`
if(review==='warden-ram'){
 const {tickModularAttack}=await import('./systems/enemy-combat.js');
 const boss=run.enemies.find(e=>e.id===run.introBossId);
 run.arms=[];run.health.invulnerableUntil=Infinity;boss.territory.state='engaged';
 Object.assign(run.player,{x:boss.x,z:boss.z+3,y:boss.y});
 let warning;
 const prepare=()=>{boss.enemyAttack={index:0,phase:1,readyAt:0,warning:null};run.time+=10;Object.assign(run.player,{x:boss.x,z:boss.z+3,y:boss.y});tickModularAttack(run,boss,run.player,()=>{},true);warning=boss.enemyAttack.warning;run.time=warning.started+.8;};
 prepare();enemyReview={paused:true};document.body.dataset.screen='';
 const controls=document.createElement('aside');controls.id='ram-proof';controls.style.cssText='position:fixed;bottom:95px;left:8px;z-index:100;background:#14211eee;color:white;font:12px system-ui;padding:6px;max-width:220px';
 const output=document.createElement('output');output.style.display='block';controls.append(output);
 const publish=result=>{const proof={name:boss.bossName,recipe:boss.recipeId,mode:warning.mode,angle:warning.angle,radius:warning.radius,result,player:{...run.player},boss:{x:boss.x,z:boss.z},time:run.time};output.textContent=result;controls.dataset.proof=JSON.stringify(proof);};
 for(const [label,forward,side]of [['Спереди',3,0],['Сбоку',0,3],['Сзади',-3,0]]){const button=document.createElement('button');button.textContent=label;button.style.cssText='min-height:44px;min-width:60px';button.onclick=()=>{prepare();Object.assign(run.player,{x:boss.x+side,z:boss.z+forward});run.time=warning.at;let hits=0;tickModularAttack(run,boss,run.player,()=>hits++,true);publish(label+': '+hits+' попаданий');};controls.append(button);}
 const reset=document.createElement('button');reset.textContent='Замах';reset.style.cssText='min-height:44px';reset.onclick=()=>{prepare();publish('Тест Стража · замах');};controls.append(reset);document.body.append(controls);publish('Тест Стража · замах');
}else `;
const server=await createServer({root:process.cwd(),configFile:false,plugins:[{name:'ram-proof',enforce:'pre',transform(code,id){if(id.split('?')[0]===process.cwd()+'/src/main.js')return code.replace("if(review==='story-evidence')",fixture+"if(review==='story-evidence')");}}],server:{host:'127.0.0.1',port:5297,strictPort:true,watch:{ignored:['**/artifacts/**','**/docs/proof/**','**/temp/**','**/dist/**']}}});await server.listen();console.log('Warden proof http://127.0.0.1:5297/?review=warden-ram&lang=ru');
