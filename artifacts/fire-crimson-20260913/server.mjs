import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
const before=process.argv.includes('--before');
const server=await createServer({server:{host:'127.0.0.1',port:5311,strictPort:true},plugins:[{name:'fire-proof',enforce:'pre',transform(source,id){
 if(before&&id.endsWith('/src/systems/soul-fx-view.js'))return readFileSync(new URL('./soul-fx-view.before.js',import.meta.url),'utf8');
 if(id.endsWith('/src/main.js'))return source.replace("if(review==='story-evidence')", "if(review==='fire-proof'){const {prepare}=await import('/artifacts/fire-crimson-20260913/review.js');enemyReview=prepare(run,params);document.body.dataset.screen='';}\nelse if(review==='story-evidence')");
}}]});
await server.listen();server.printUrls();
