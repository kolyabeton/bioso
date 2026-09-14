import http from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
const root=resolve(process.argv[2]),proof=resolve('docs/proof/itch-stress-20260910');
await mkdir(proof,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.svg':'image/svg+xml'};
// Local proof-only telemetry. The ZIP is served unchanged when ?proof is absent.
const instrument=`<script>
const failures=[];addEventListener('error',e=>failures.push(e.error?.stack||e.message));addEventListener('unhandledrejection',e=>failures.push(String(e.reason)));
let saved=false;setInterval(()=>{
 if(!window.bioso)return;
 let output=document.getElementById('release-proof');if(!output){output=document.createElement('script');output.id='release-proof';output.type='application/json';document.body.append(output)}
 const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
 const data={snapshot:window.bioso.snapshot(),viewport:[innerWidth,innerHeight],stage:box('game'),dialog:box('panel'),failures,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),failedResources:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name)};
 output.textContent=JSON.stringify(data);
 const text=document.getElementById('stress-report')?.textContent;if(text){const report=JSON.parse(text);if(report.end&&!saved){saved=true;fetch('/__report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'stress-'+data.snapshot.settings.quality+'-'+innerWidth,report,environment:data})})}}
},1000);
</script>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='POST'&&url.pathname==='/__report'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>5_000_000)throw Error('Report too large')}
   const data=JSON.parse(body);if(!/^[a-z0-9-]+$/.test(data.name))throw Error('Invalid name');
   await writeFile(join(proof,data.name+'.json'),JSON.stringify(data,null,2)+'\n');res.end('Saved');return;
  }
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'/')){res.writeHead(403).end();return}
  const file=(await stat(path)).isDirectory()?join(path,'index.html'):path;
  const bytes=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  res.end(extname(file)==='.html'&&url.searchParams.has('proof')?bytes.toString().replace('</head>',instrument+'</head>'):bytes);
 }catch{res.writeHead(404).end('Not found')}
});const port=Number(process.argv[3])||5198;server.listen(port,'127.0.0.1',()=>console.log(`BIOSO release proof http://127.0.0.1:${port}/game/?proof`));
