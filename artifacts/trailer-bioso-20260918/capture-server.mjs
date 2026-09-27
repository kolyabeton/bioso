import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve('artifacts/trailer-bioso-20260918/raw');await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5299,strictPort:true,hmr:false},plugins:[{
 name:'bioso-trailer-capture',enforce:'pre',transform(source,id){
  if(id.endsWith('/src/game-view.js')){
   return "import {trailerCamera,poseTrailerCamera,renderTrailerView} from '/artifacts/trailer-bioso-20260918/trailer-cameras.js';\n"+source
    .replace('const camera=new T.OrthographicCamera(-25,25,25,-25,.1,600)', 'const camera=trailerCamera(new T.OrthographicCamera(-25,25,25,-25,.1,600))')
    .replace('camera.updateMatrixWorld();survivalEnding.update', 'poseTrailerCamera(camera,s,w,h);camera.updateMatrixWorld();survivalEnding.update')
    .replace('renderer.render(scene,camera);damageNumbers.update', 'renderTrailerView(renderer,scene,camera,hero);damageNumbers.update');
  }
  if(!id.endsWith('/src/main.js'))return;
  const hook="if(review==='race')";if(!source.includes(hook))throw Error('Capture hook changed');
  return source.replace(hook,"if(review==='trailer'){start(params.get('mission')||'survival',20260918);const {prepareTrailer}=await import('/artifacts/trailer-bioso-20260918/capture-fixture.js');enemyReview=prepareTrailer(run,params,ui,{snapshot:()=>window.bioso.snapshot(),setInput:value=>Object.assign(movement,value),settings});document.body.dataset.screen='';}else "+hook);
 },configureServer(s){s.middlewares.use(async(req,res,next)=>{
  const m=req.url?.match(/^\/__trailer\/([a-z-]+)\.(mp4|webm|json|png)$/);if(req.method!=='POST'||!m)return next();
  try{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>100e6)throw Error('size');chunks.push(c);}await writeFile(path.join(out,m[1]+'.'+m[2]),Buffer.concat(chunks));res.end('saved');}catch(e){res.statusCode=500;res.end(String(e));}
 });}
}]});await server.listen();console.log('Trailer capture http://127.0.0.1:5299');
