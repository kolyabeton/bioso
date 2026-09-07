import {ENEMY_WEAPONS,tickModularAttack} from './systems/enemy-combat.js';
import {installBiotechRecorder} from './biotech-record.js';
import {CATALOG} from './catalog.js';
import * as T from 'three';
import {createEnemyAssemblyView} from './enemy-assembly-view.js';
import {ENEMY_RECIPES,BOSS_RECIPES,assembleEnemy} from './systems/enemy-assembly.js';
import {modelInfo} from './asset-models.js';
if(!import.meta.env.DEV&&import.meta.env.MODE!=='acceptance')throw Error('Review is available in development only');
const mode=new URLSearchParams(location.search).get('mode')||'normal',attacks=mode==='attacks',boss=mode==='boss',crowd=mode==='crowd',kind=boss?'boss':mode==='elite'?'elite':'normal';
const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#1c2929');renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55;
const scene=new T.Scene();scene.add(new T.HemisphereLight('#e5eee1','#435950',3));const light=new T.DirectionalLight('#ffe4bf',4);light.position.set(-8,15,10);scene.add(light);
const camera=new T.OrthographicCamera(),view=createEnemyAssemblyView(scene),recipes=attacks?Object.keys(ENEMY_WEAPONS).map(key=>({...ENEMY_RECIPES.find(r=>r.weapons[0]===key),name:CATALOG[key].name})):boss?BOSS_RECIPES:ENEMY_RECIPES,columns=crowd?10:attacks?4:5,rows=crowd?10:boss?1:attacks?2:3,space=crowd?3.2:5.3,enemies=[],labels=[];
for(let i=0;i<(crowd?100:recipes.length);i++){
 const r=recipes[i%recipes.length],e={id:i+1,x:(i%columns-(columns-1)/2)*space,z:(Math.floor(i/columns)-(rows-1)/2)*space,y:0,hp:1,radius:boss?1.35:1.15,role:r.role,recipeId:r.id,kind:boss&&i===4?'final':kind,tier:boss?i+1:mode==='elite'?3:1+(r.from||0)/480,enemyAttack:{index:0,readyAt:0,warning:null},assembly:assembleEnemy(r,boss?i+1:mode==='elite'?3:1+(r.from||0)/480,kind)};enemies.push(e);
 if(!crowd){const label=document.createElement('div');label.className='label';label.innerHTML=`${r.name}<small>${boss?'Логово '+(i+1):r.role==='mass'?'С начала · I':r.role==='ranged'?'С 16 минут · III':'С 8 минут · II'}</small>`;document.body.append(label);labels.push(label);}
}
document.querySelector('#subtitle').textContent=attacks?'Анимации врагов · замах → удар → возврат · реальные таймеры атак':crowd?'100 модульных существ · общий инстансинг деталей':boss?'Пять логов · усиленные корпуса и оружие':mode==='elite'?'15 элитных сборок · дополнительное оружие и бронепластины':'15 рецептов · общий каталог с игроком · усиление по времени';
const combat={time:0,world:{walkable:()=>true},hostileShots:[],events:[]};if(attacks)installBiotechRecorder(document.querySelector('canvas'));
let frames=0,last=performance.now(),fps=0;const samples=[];
function frame(now){requestAnimationFrame(frame);const width=innerWidth,height=innerHeight;renderer.setSize(width,height,false);const span=crowd?40:boss?11:attacks?14:22,aspect=width/height;camera.left=-Math.max(span*aspect,attacks?24:31)/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=200;camera.position.set(0,35,25);camera.lookAt(0,0,-1.5);camera.updateProjectionMatrix();
 if(attacks){combat.time=now/1000;combat.hostileShots=[];combat.events=[];for(const e of enemies){tickModularAttack(combat,e,{x:e.x,y:e.y,z:e.z+1.3},()=>{});}}
 view.update(enemies,{x:0,z:10000},now/1000,1);renderer.render(scene,camera);
 for(let i=0;i<labels.length;i++){const e=enemies[i],p=new T.Vector3(e.x,0,e.z+.95).project(camera);if(attacks)labels[i].querySelector('small').textContent=e.enemyAttack.warning?'Замах / прицеливание':now/1000-(e.attackPose?.at??-100)<.12?'Удар':'Возврат / ожидание';labels[i].style.left=(p.x*.5+.5)*width+'px';labels[i].style.top=(-p.y*.5+.5)*height+8+'px';}
 frames++;if(now-last>=1000){fps=Math.round(frames*1000/(now-last));last=now;frames=0;const info={...view.info(),...modelInfo(),fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};samples.push(info);if(samples.length>20)samples.shift();document.querySelector('#status').textContent=JSON.stringify(info);}
}
requestAnimationFrame(frame);
