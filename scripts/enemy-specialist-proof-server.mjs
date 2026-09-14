// Local-only evidence sink for development fixture recordings. No browser profiles or automation.
import http from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const out=resolve('docs/proof/enemy-specialists-20260910');
const allowed=new Set(['shield-bearer','divider','mirrorling','puppeteer']);

http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(['http://127.0.0.1:4173','http://127.0.0.1:5173'].includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 const url=new URL(req.url,'http://127.0.0.1'),match=url.pathname.match(/^\/__enemy-specialist-proof\/([a-z-]+)(\.png)?$/);
 if(req.method!=='POST'||!match||!allowed.has(match[1])){res.writeHead(400).end();return;}
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>50e6){res.writeHead(413).end();return;}chunks.push(chunk);}
 await mkdir(out,{recursive:true});await writeFile(join(out,match[1]+(match[2]||'.webm')),Buffer.concat(chunks));
 res.writeHead(200).end('saved');
}).listen(4190,'127.0.0.1',()=>console.log('Enemy specialist proof sink: http://127.0.0.1:4190'));
