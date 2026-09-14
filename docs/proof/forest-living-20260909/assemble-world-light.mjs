import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('.',import.meta.url));
const entries=[['garden','garden','Верхние сады'],['scrap','quarantine','Тихая свалка'],['forest','core','Корневой лес'],['city','nursery','Заросший город'],['mother','mother','Роевой питомник']];
const width=260,height=563,gap=10,layers=[],references=[],summary=[];
const label=(text,w=width)=>Buffer.from(`<svg width="${w}" height="45"><text x="10" y="28" fill="#e6e8dc" font-family="Arial" font-size="19">${text}</text></svg>`);
for(const [i,[id,reference,name]] of entries.entries()){
 const path=dir+`world-light-final-${id}-390.png`,meta=JSON.parse(await readFile(dir+`world-light-final-${id}-390.json`,'utf8')).current;
 if(meta.viewport.width!==390||meta.viewport.height!==844||meta.loadingTiles||meta.assetErrors||meta.errors.length)throw Error('Incomplete visual evidence: '+id);
 const left=gap+i*(width+gap),game=await sharp(path).resize(width,height,{fit:'contain',background:'#202723'}).png().toBuffer();
 layers.push({input:label(name),left,top:0},{input:game,left,top:45});
 references.push({input:label(name),left,top:0},{input:await sharp(dir+`../../concepts/world/environments-v3/${reference}-target-v1.png`).resize(width,height,{fit:'contain',background:'#202723'}).png().toBuffer(),left,top:45},{input:game,left,top:height+90});
 summary.push({environment:id,mode:meta.mode,route:meta.route,viewport:meta.viewport,drawCalls:meta.drawCalls,triangles:meta.triangles,textures:meta.textures,staticShadowCells:meta.staticShadowCells,shadowMode:meta.environmentShadowMode,assetErrors:meta.assetErrors});
}
const total=entries.length*(width+gap)+gap;
await sharp({create:{width:total,height:height+55,channels:4,background:'#202723'}}).composite(layers).png().toFile(dir+'world-light-all-five.png');
references.push({input:label('РЕФЕРЕНСЫ ВВЕРХУ · ТЕКУЩАЯ ИГРА ВНИЗУ',total-20),left:10,top:height+45});
await sharp({create:{width:total,height:height*2+100,channels:4,background:'#202723'}}).composite(references).png().toFile(dir+'world-light-reference-comparison.png');
await writeFile(dir+'world-light-visual-summary.json',JSON.stringify(summary,null,2));
console.log(summary);
