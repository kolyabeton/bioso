// Local-only evidence sink and Vite server; no browser profiles or automation.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve('docs/proof/forest-living-20260909');
const port=Number(process.argv.find(a=>a.startsWith('--port='))?.split('=')[1]||4185);
const server=await createServer({root:process.argv.includes('--built')?resolve('temp/forest-living-build/acceptance'):undefined,configFile:false,plugins:[{name:'forest-proof',configureServer(server){server.middlewares.use('/__forest-proof',async(req,res)=>{
 const name=(req.url||'').slice(1);
 if(req.method!=='POST'||!/^[-a-z0-9]+\.(png|json|webm|mp4)$/.test(name)){res.statusCode=400;res.end();return;}
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>80e6){res.statusCode=413;res.end();return;}chunks.push(chunk);}
 await mkdir(out,{recursive:true});await writeFile(join(out,name),Buffer.concat(chunks));res.end('saved');
});}}],server:{host:'127.0.0.1',port,strictPort:true,watch:{ignored:['**/docs/proof/**','**/outputs/**','**/output/**','**/temp/**','**/dist/**']}}});
await server.listen();console.log('Forest proof: http://127.0.0.1:'+port);
