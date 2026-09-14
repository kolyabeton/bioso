import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {build} from 'vite';

// Local, temporary verification endpoints. Nothing here is shipped in dist.
const bundle=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:true,rollupOptions:{input:resolve('scripts/asset-build/browser-check.js')}}});
const checkCode=bundle.output.find(output=>output.type==='chunk').code;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
const diagnostics=`<script>addEventListener('error',e=>{document.documentElement.dataset.runtimeError=e.message});setInterval(()=>{if(!window.bioso)return;let p=document.getElementById('asset-runtime');if(!p){p=document.createElement('pre');p.id='asset-runtime';p.hidden=true;document.body.append(p)}const stage=document.getElementById('game').getBoundingClientRect(),dialog=document.getElementById('panel').getBoundingClientRect();p.textContent=JSON.stringify({snapshot:window.bioso.snapshot(),viewport:[innerWidth,innerHeight],stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height},dialog:{x:dialog.x,y:dialog.y,width:dialog.width,height:dialog.height},brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),failedResources:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name),error:document.documentElement.dataset.runtimeError||null})},500)</script>`;
for(const [port,directory]of [[5274,'temp/optimized-acceptance'],[5275,'temp/original-acceptance']]){
  const root=resolve(directory);
  http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1');
      res.setHeader('Cache-Control','no-store');
      if(url.pathname==='/__asset-check.js'){res.setHeader('Content-Type','text/javascript');res.end(checkCode);return;}
      if(url.pathname==='/__asset-check.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>BIOSO asset verification</title><h1>Runtime asset verification</h1><button id="start">Check all resources</button><pre id="status">Ready</pre><script type="module" src="/__asset-check.js"></script>');return;}
      let path=resolve(root,'.'+decodeURIComponent(url.pathname));
      if(path!==root&&!path.startsWith(root+'/')){res.writeHead(403).end();return;}
      if(path===root)path=join(root,'index.html');
      if(!(await stat(path)).isFile()){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');
      const bytes=await readFile(path);res.end(extname(path)==='.html'?bytes.toString().replace('</head>',diagnostics+'</head>'):bytes);
    }catch{res.writeHead(404).end('Not found');}
  }).listen(port,'127.0.0.1',()=>console.log(`Asset proof http://127.0.0.1:${port}/`));
}
