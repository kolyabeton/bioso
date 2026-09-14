// Isolated outputs leave another task's dist/export untouched.
import {build} from 'vite';
import {mkdir,mkdtemp,writeFile,readFile,cp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {prepareAssets,sizeReport,filesIn,hash} from './asset-build/assets.mjs';
import {assetUrlPlugin,assetCssPlugin} from './asset-build/urls.mjs';
const root=resolve('.'),temporaryRoot=join(root,'temp/asset-build');await mkdir(temporaryRoot,{recursive:true});
const staging=await mkdtemp(join(temporaryRoot,'forest-'));
try{
 let manifest;
 if(process.argv.includes('--reuse-assets')){
  const previous=join(root,'temp/forest-living-build/production');
  manifest=JSON.parse(await readFile(join(previous,'asset-manifest.json'),'utf8'));
  const sources=(await filesIn(join(root,'public'))).filter(p=>!p.endsWith('/.DS_Store'));
  if(sources.length!==manifest.entries.length)throw Error('Asset set changed; run full forest-proof-build');
  for(const entry of manifest.entries)if(hash(await readFile(join(root,'public',entry.source)))!==entry.sourceHash)throw Error('Asset changed: '+entry.source);
  for(const entry of [...manifest.entries,...manifest.generated]){const name=entry.url.slice(1);await mkdir(resolve(staging,name,'..'),{recursive:true});await cp(join(previous,name),join(staging,name));}
  await cp(join(previous,'asset-manifest.json'),join(staging,'asset-manifest.json'));
 }else manifest=await prepareAssets(join(root,'public'),staging);
 const reports={};
 for(const mode of ['production','acceptance']){
  const outDir=join(root,'temp/forest-living-build',mode);
  await build({root,configFile:false,publicDir:staging,mode,plugins:[assetUrlPlugin(root,manifest.urls)],css:{postcss:{plugins:[assetCssPlugin(manifest.urls)]}},build:{outDir,emptyOutDir:true}});
  const measured=await sizeReport(outDir);
  reports[mode]={...measured,limitBytes:null,remainingBytes:null,sizePolicy:'User removed the download-size cap for the Forest fidelity pass on 2026-09-09'};
 }
 await mkdir('docs/proof/forest-living-20260909',{recursive:true});
 await writeFile('docs/proof/forest-living-20260909/build.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports,null,2));
 // 2026-09-09: user removed the 99.4 MB cap in favour of reference fidelity.
 // Always report exact bytes; do not substitute download size for render budgets.
}finally{await rm(staging,{recursive:true,force:true});}
