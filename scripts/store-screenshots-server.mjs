import {createServer} from 'vite';
const hook="if(review==='race')";
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5291,strictPort:true,hmr:false},plugins:[{
 name:'isolated-store-capture',enforce:'pre',transform(source,id){
  if(!id.endsWith('/src/main.js'))return;
  if(!source.includes(hook))throw Error('Capture entry point changed');
  return source.replace(hook,"if(review==='press'){start(params.get('mission')||'survival',20260910);const {preparePress}=await import('/scripts/store-screenshots-fixture.js');enemyReview=preparePress(run,params,ui,()=>window.bioso.snapshot());document.body.dataset.screen=ui.screen||'';}else "+hook);
 }
}]});
await server.listen();console.log('Isolated screenshot server: http://127.0.0.1:5291');
