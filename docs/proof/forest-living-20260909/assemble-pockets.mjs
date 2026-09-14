import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const dir=fileURLToPath(new URL('.',import.meta.url));
const rows=[['garden','Верхние сады'],['quarantine','Тихая свалка'],['core','Корневой лес'],['nursery','Заросший город'],['mother','Роевой питомник']];
const layers=[];
for(const [i,[id,name]]of rows.entries()){
 const input=await sharp(dir+`pockets-${id}-v3-390.png`).resize(312,675,{fit:'contain',background:'#17201e'}).png().toBuffer();
 const label=Buffer.from(`<svg width="324" height="52"><text x="12" y="34" fill="#eef0e8" font-size="20" font-family="Arial">${name}</text></svg>`);
 layers.push({input:label,left:i*324,top:0},{input,left:i*324+6,top:52});
 const p=JSON.parse(await readFile(dir+`pockets-${id}-v3-390.json`,'utf8'));
 console.log(JSON.stringify({id,draws:p.drawCalls,triangles:p.triangles,textures:p.textures,errors:p.assetErrors,failed:p.failedModels}));
}
await sharp({create:{width:1620,height:740,channels:4,background:'#17201e'}}).composite(layers).png().toFile(dir+'pockets-five-v3.png');
const compare=[];
for(const [i,[file,label]]of [['targets-core-v3-390.png','Лес — до'],['pockets-core-v3-390.png','Лес — сейчас']].entries()){
 compare.push({input:await sharp(dir+file).resize(390,844).png().toBuffer(),left:12+i*402,top:52});
 compare.push({input:Buffer.from(`<svg width="390" height="52"><text x="12" y="34" fill="#eef0e8" font-size="21" font-family="Arial">${label}</text></svg>`),left:12+i*402,top:0});
}
await sharp({create:{width:816,height:908,channels:4,background:'#17201e'}}).composite(compare).png().toFile(dir+'pockets-forest-before-after.png');
