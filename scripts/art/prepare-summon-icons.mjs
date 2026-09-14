// User-authorized local background removal; keep source RGB and create alpha only.
import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
const source='/Users/serg/.codex/generated_images/01a096f5-e01b-70a1-8a77-afc6a4d8ac5b/';
const items=[['swarm-leg-v1','exec-0c5b4c44-230c-422c-96b8-ad7f56fafc1c.png'],['drone-arm-v1','exec-0cda92f6-3fdf-46cc-8956-234ddf7b8831.png']];
await mkdir(new URL('docs/art/summon-equipment-v1/',root),{recursive:true});
for(const [name,file]of items){
 const input=new URL(`docs/art/summon-equipment-v1/${name}-source.png`,root);
 await copyFile(source+file,input);
 const {data,info}=await sharp(fileURLToPath(input)).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,n=w*h,background=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const neutral=i=>{const a=data[i*3],b=data[i*3+1],c=data[i*3+2];return Math.min(a,b,c)>120&&Math.max(a,b,c)-Math.min(a,b,c)<7;};
 const add=i=>{if(i>=0&&i<n&&!background[i]&&neutral(i)){background[i]=1;queue[tail++]=i;}};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(head<tail){const i=queue[head++],x=i%w;if(x)add(i-1);if(x<w-1)add(i+1);add(i-w);add(i+w);}
 // Remove disconnected checkerboard compression specks; keep the single equipment silhouette.
 const visited=new Uint8Array(n);let largest=[];
 for(let start=0;start<n;start++)if(!background[start]&&!visited[start]){
  head=0;tail=0;queue[tail++]=start;visited[start]=1;
  const push=i=>{if(i>=0&&i<n&&!background[i]&&!visited[i]){visited[i]=1;queue[tail++]=i;}};
  while(head<tail){const i=queue[head++],x=i%w;if(x)push(i-1);if(x<w-1)push(i+1);push(i-w);push(i+w);}
  if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
 }
 background.fill(1);for(const i of largest)background[i]=0;
 const rgba=Buffer.alloc(n*4);let opaque=0;
 for(let i=0;i<n;i++){rgba[i*4]=data[i*3];rgba[i*4+1]=data[i*3+1];rgba[i*4+2]=data[i*3+2];rgba[i*4+3]=background[i]?0:255;opaque+=!background[i];}
 // Resize only after alpha extraction so the contour is correctly antialiased.
 await sharp(rgba,{raw:{width:w,height:h,channels:4}}).resize(768,768).png().toFile(fileURLToPath(new URL(`public/assets/ui/items/${name}.png`,root)));
 console.log(name,{foregroundFraction:opaque/n,removedPixels:n-opaque});
}
