import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5296,strictPort:true},plugins:[{
 name:'wave-profile',enforce:'pre',transform(source,id){
  if(id.endsWith('/src/main.js'))return source.replace('browserQA?.tick();', 'if(enemyReview?.finished)return;browserQA?.tick();').replace("if(review==='story-evidence')", "if(review==='wave-perf'){const {prepare}=await import('/artifacts/wave-performance-20260913/review.js');enemyReview=prepare(run,params);document.body.dataset.screen='';}\nelse if(review==='story-evidence')");
  if(id.endsWith('/src/game-view.js'))for(const [name,call]of Object.entries({modular:'modularEnemies.update(regularEnemies,p,combatTime(s),enemyScale,reducedMotion);',contacts:"enemyContacts.update(visibleEnemies,s.world,quality==='high'&&biomeActive,enemyScale);",warnings:'enemyWarnings.update(s);',gpuSubmit:'renderer.render(scene,camera);'}))source=source.replace(call,`{const t=performance.now();${call}(globalThis.__wavePerf??={}).${name}=performance.now()-t;}`);
  return source;
 }
}]});await server.listen();server.printUrls();
