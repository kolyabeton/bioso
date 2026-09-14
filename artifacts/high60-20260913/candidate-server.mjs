import {createServer} from 'node:http';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('artifacts/high60-20260913/candidate'),reports=resolve('artifacts/high60-20260913');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'};
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:5316');
 if(url.pathname==='/_high60-result'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>2000000)throw Error('too large');}const data=JSON.parse(body),label=String(data.scenario).replace(/[^a-z]/g,'');await writeFile(resolve(reports,'candidate-'+Date.now()+'-'+label+'.json'),JSON.stringify(data,null,2));res.end('saved');return;}
 const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/'))throw Error('path');const bytes=await readFile(path);res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(bytes);
}catch{res.statusCode=404;res.end('not found');}}).listen(5316,'127.0.0.1',()=>console.log('http://127.0.0.1:5316'));
