import http from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const out=resolve('docs/proof/survival-late-pressure-20260915');
const allowed=new Set(['ranged.png','ranged.json','swarm.png','swarm.json']);

http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(['http://127.0.0.1:4173','http://127.0.0.1:5173'].includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 const url=new URL(req.url,'http://127.0.0.1'),match=url.pathname.match(/^\/__survival-pressure-proof\/([a-z]+\.(?:png|json))$/);
 if(req.method!=='POST'||!match||!allowed.has(match[1])){res.writeHead(400).end();return;}
 let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>20e6){res.writeHead(413).end();return;}chunks.push(chunk);}
 await mkdir(out,{recursive:true});await writeFile(join(out,match[1]),Buffer.concat(chunks));res.writeHead(200).end('saved');
}).listen(4191,'127.0.0.1',()=>console.log('Survival pressure proof sink: http://127.0.0.1:4191'));
