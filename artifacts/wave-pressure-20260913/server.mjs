import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5296,strictPort:true},plugins:[{
 name:'local-wave-proof',enforce:'pre',transform(source,id){
  if(!id.endsWith('/src/main.js'))return null;
  return source.replace("if(review==='story-evidence')", "if(review==='wave-pressure'){const {prepare}=await import('/artifacts/wave-pressure-20260913/review.js');enemyReview=prepare(run,params);document.body.dataset.screen='';}\nelse if(review==='story-evidence')");
 }
}]});
await server.listen();server.printUrls();
