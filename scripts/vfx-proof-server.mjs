import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const port=Number(process.env.BIOSO_VFX_PROOF_PORT||4191);
const output=path.resolve(process.env.BIOSO_VFX_PROOF_DIR||'artifacts/vfx-reference-v2/videos');
const allowed=new Set(['claws','drill','whip','enemy-seed','enemy-needle','boss-shot']);
await mkdir(output,{recursive:true});

createServer((request,response)=>{
 response.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5173');
 response.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 response.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(request.method==='OPTIONS'){response.writeHead(204).end();return;}
 const videoMatch=request.url?.match(/^\/vfx-proof\/([a-z-]+)$/),frameMatch=request.url?.match(/^\/vfx-frame\/([a-z-]+)\/(\d{3})$/),id=videoMatch?.[1]||frameMatch?.[1];
 if(request.method!=='POST'||!allowed.has(id)){response.writeHead(404).end('not found');return;}
 const chunks=[];let size=0;
 request.on('data',chunk=>{size+=chunk.length;if(size<=12*1024*1024)chunks.push(chunk);else request.destroy();});
 request.on('end',async()=>{try{const file=frameMatch?(await mkdir(path.join(output,'frames',id),{recursive:true}),path.join(output,'frames',id,`${frameMatch[2]}.jpg`)):path.join(output,`${id}-3s.webm`);await writeFile(file,Buffer.concat(chunks));response.writeHead(201,{'Content-Type':'application/json'}).end(JSON.stringify({file,size}));}catch(error){response.writeHead(500).end(error.message);}});
}).listen(port,'127.0.0.1',()=>console.log(`VFX proof receiver: http://127.0.0.1:${port} -> ${output}`));
