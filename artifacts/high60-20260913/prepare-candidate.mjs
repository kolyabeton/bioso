import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join,dirname,posix,resolve} from 'node:path';
import {build} from 'vite';
import {filesIn,hash,modelIO,compressModel,webpImage,imageProfile,sizeReport} from '../../scripts/asset-build/assets.mjs';
import {assetUrlPlugin,assetCssPlugin} from '../../scripts/asset-build/urls.mjs';
const root=process.cwd(),base='/Users/serg/Library/Application Support/bioso-play/releases/20260913T135317Z-unlocked',folder=join(root,'artifacts/high60-20260913'),stage=join(folder,'prepared-public'),outDir=join(folder,'candidate');
const previous=JSON.parse(await readFile(join(base,'asset-manifest.json'),'utf8')),known=new Map(previous.entries.map(e=>[e.source,e])),generated=new Map(previous.generated.map(e=>[e.url,e]));
const sharedTextures=new Map(),textureCache=new Map(),needed=new Set(),entries=[],urls={},io=await modelIO();let reused=0,rebuilt=0;
if(!process.argv.includes('--code-only')){
for(const path of (await filesIn(join(root,'public'))).filter(p=>!p.endsWith('/.DS_Store'))){
 const name=path.slice(join(root,'public').length+1),url='/'+name,input=await readFile(path),sourceHash=hash(input),old=known.get(url);let output=input,outputName=name,cached=false;
 if(!name.endsWith('.glb')&&old?.sourceHash===sourceHash){try{const bytes=await readFile(join(base,old.url));if(hash(bytes)===old.hash){output=bytes;outputName=old.url.slice(1);cached=true;}}catch{}}
 if(cached)reused++;
 else{rebuilt++;if(name.startsWith('assets/')&&/\.(png|jpe?g)$/i.test(name)){output=await webpImage(input,imageProfile(url));outputName+='.webp';}else if(name.endsWith('.glb'))output=await compressModel(io,input,{sharedTextures,textureCache});}
 if(cached&&name.endsWith('.glb')){const json=JSON.parse(output.subarray(20,20+output.readUInt32LE(12)).toString());for(const image of json.images||[])if(image.uri){const texture=posix.normalize(posix.join(posix.dirname(outputName),image.uri));if(!texture.startsWith('assets/model-textures/'))throw Error('Unexpected cached image '+texture);needed.add(texture);}}
 const target=join(stage,outputName);await mkdir(dirname(target),{recursive:true});await writeFile(target,output);urls[url]='/'+outputName;entries.push({source:url,url:urls[url],sourceHash,hash:hash(output),sourceBytes:input.length,bytes:output.length});
 if(entries.length%100===0)console.log({assets:entries.length,reused,rebuilt});
}
for(const name of needed){if(sharedTextures.has(name))continue;const bytes=await readFile(join(base,name));if(hash(bytes)!==generated.get('/'+name)?.hash)throw Error('Cached texture hash mismatch '+name);sharedTextures.set(name,bytes);}
for(const [name,bytes]of sharedTextures){await mkdir(dirname(join(stage,name)),{recursive:true});await writeFile(join(stage,name),bytes);}
await mkdir(join(stage,'licenses'),{recursive:true});await copyFile(join(root,'node_modules/meshoptimizer/LICENSE.md'),join(stage,'licenses/meshoptimizer-MIT.txt'));
await writeFile(join(stage,'asset-manifest.json'),JSON.stringify({urls,entries,generated:[...sharedTextures].map(([name,bytes])=>({url:'/'+name,bytes:bytes.length,hash:hash(bytes)}))}));
}else Object.assign(urls,JSON.parse(await readFile(join(stage,'asset-manifest.json'),'utf8')).urls);
const proof={name:'high60-candidate',enforce:'pre',transformIndexHtml:html=>html.replace('<head>','<head><script>Object.defineProperty(window,"devicePixelRatio",{value:2,configurable:true});</script>'),transform(source,id){if(!id.endsWith('/src/main.js'))return null;return source.replace("run=createWorldRun(profile,'survival',review?20317:undefined)","run=createWorldRun(review==='high60'?undefined:profile,'survival',review?20317:undefined)").replace('if(run.dead){','enemyReview?.afterSimulation?.();if(run.dead){').replace('enemyReview?.afterFrame?.({cpuMs:','enemyReview?.afterFrame?.({gpuInfo:view.frameInfo(),cpuMs:').replace('browserQA?.tick();','if(enemyReview?.finished)return;browserQA?.tick();').replace("if(review==='story-evidence')","if(review==='high60'){const {prepare}=await import('/artifacts/high60-20260913/review.js');enemyReview=prepare(run,params,value=>Object.assign(movement,value),ui);document.body.dataset.screen='';}\nelse if(review==='story-evidence')");}};
await build({root,configFile:false,publicDir:stage,mode:'acceptance',plugins:[proof,assetUrlPlugin(root,urls)],css:{postcss:{plugins:[assetCssPlugin(urls)]}},build:{outDir,emptyOutDir:true}});
const report={reused,rebuilt,...await sizeReport(outDir)};await writeFile(join(folder,'candidate-build.json'),JSON.stringify(report,null,2));console.log(report);
