// Local acceptance server for canvas MediaRecorder evidence. No browser automation or profiles.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('output/boss-animation-v5/acceptance'),out=path.resolve('docs/proof/boss-animation-v5');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.webm':'video/webm'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),match=url.pathname.match(/^\/__boss-animation-proof\/(garden|quarantine|core|nursery|mother)$/);
 if(req.method==='POST'&&match){let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>40e6){res.writeHead(413).end();req.destroy();}else chunks.push(c);});req.on('end',()=>{if(size>40e6)return;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,match[1]+'.webm'),Buffer.concat(chunks));res.writeHead(200).end('saved');});return;}
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(file===root||!fs.existsSync(file))file=path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).on('error',()=>res.end()).pipe(res);
}).listen(5291,'127.0.0.1',()=>console.log('Animation proof http://127.0.0.1:5291'));
