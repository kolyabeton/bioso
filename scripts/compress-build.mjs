// Shrinks an exported build in place for web delivery: itch.io players wait on every
// megabyte, and the authored sources stay untouched so re-exports can always start clean.
import {readdirSync,statSync,renameSync,unlinkSync,readFileSync,writeFileSync} from 'node:fs';
import {join,extname,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {createHash} from 'node:crypto';

export async function compressBuild(root,{images=true}={}){
root=resolve(root);
if(!statSync(join(root,'index.html'),{throwIfNoEntry:false})?.isFile())throw new Error(`Not a game build: ${root}. Run npm run build first, or pass a build directory.`);
const QUALITY=Number(process.env.WEBP_QUALITY||82);
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(join(dir,d.name)):[join(dir,d.name)]);
const files=walk(root);
const size=f=>statSync(f).size;
const mb=b=>(b/1048576).toFixed(1)+' MB';
let before=0,after=0;

async function shrinkImage(file){
 const original=size(file),tmp=file+'.tmp';
 // Release profile used by the approved 77.6 MB archive: include all textures.
 const meta=await sharp(file).metadata();
 // Preserve dimensions and image containers so authored UVs and URLs remain valid.
 const pipeline=sharp(file);
 if(meta.format==='png')pipeline.png({compressionLevel:9,effort:10,palette:true});
 else if(meta.format==='jpeg')pipeline.jpeg({quality:QUALITY,mozjpeg:true});
 else pipeline.webp({quality:QUALITY,effort:6,alphaQuality:QUALITY,smartSubsample:true});
 await pipeline.toFile(tmp);
 if(size(tmp)<original*.95){renameSync(tmp,file);return [original,size(file),`${meta.width}x${meta.height}`];}
 unlinkSync(tmp);return [original,original,'kept'];
}

function shrinkAudio(file,bitrate){
 // Web Audio decodes by content, not by file name, so the container swap stays invisible
 // to the game while AAC replaces raw PCM and over-fat MP3s.
 const original=size(file),tmp=file+'.tmp.m4a';
 try{execFileSync('afconvert',['-f','m4af','-d','aac','-b',String(bitrate),'-s','3',file,tmp],{stdio:'ignore'});}
 catch{try{unlinkSync(tmp);}catch{}return [original,original,'skipped'];}
 if(size(tmp)<original*.95){renameSync(tmp,file);return [original,size(file),`${bitrate/1000}k`];}
 unlinkSync(tmp);return [original,original,'kept'];
}

for(const file of files){
 const ext=extname(file).toLowerCase();
 let result=null;
 if(images&&['.webp','.png','.jpg','.jpeg'].includes(ext))result=await shrinkImage(file);
 else if(ext==='.wav')result=shrinkAudio(file,96000);
 else if(ext==='.mp3'||ext==='.m4a')result=shrinkAudio(file,128000);
 if(!result)continue;
 before+=result[0];after+=result[1];
 if(result[0]-result[1]>512*1024)console.log(`  ${file.slice(root.length+1)} ${mb(result[0])} → ${mb(result[1])} (${result[2]})`);
}
console.log(`media ${mb(before)} → ${mb(after)} (saved ${mb(before-after)})`);

refreshAssetManifest(root);
return {before,after,saved:before-after};
}

export function refreshAssetManifest(root){
const manifestPath=join(root,'asset-manifest.json');
if(statSync(manifestPath,{throwIfNoEntry:false})?.isFile()){
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 for(const entry of [...manifest.entries,...manifest.generated]){
  const bytes=readFileSync(join(root,entry.url.replace(/^\//,'')));
  entry.bytes=bytes.length;entry.hash=createHash('sha256').update(bytes).digest('hex');
 }
 writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
 await compressBuild(root);
}
