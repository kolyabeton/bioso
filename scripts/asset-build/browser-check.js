import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {loadModel,modelInfo} from '../../src/asset-models.js';

const status=document.querySelector('#status'),report={models:0,images:0,audio:0,failures:[]};
const publish=()=>{status.textContent=JSON.stringify(report,null,2);};
document.querySelector('#start').onclick=async event=>{
  event.target.disabled=true;
  const manifest=await (await fetch('/asset-manifest.json')).json();
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  for(const entry of manifest.entries){
    try{
      if(entry.url.endsWith('.glb')){
        const root=entry.url.startsWith('/assets/kit/')?await loadModel(entry.url.split('/').at(-1).replace('.glb','')):(await loader.loadAsync(entry.url)).scene;
        if(!root)throw Error('Model fallback was used');
        root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material)){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}});
        report.models++;
      }else if(/\.(png|jpe?g|webp)$/i.test(entry.url)){
        const image=new Image();image.src=entry.url;await image.decode();if(!image.naturalWidth)throw Error('Empty image');report.images++;
      }else if(/\.(mp3|wav|ogg)$/i.test(entry.url)){
        const bytes=await(await fetch(entry.url)).arrayBuffer(),context=new AudioContext();
        try{const decoded=await context.decodeAudioData(bytes);if(decoded.duration<=0)throw Error('Empty audio');report.audio++;}finally{await context.close();}
      }
    }catch(error){report.failures.push({url:entry.url,message:error.message});}
    publish();
  }
  report.loader=modelInfo();report.complete=true;publish();
};
