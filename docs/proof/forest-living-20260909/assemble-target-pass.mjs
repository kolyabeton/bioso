import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('.',import.meta.url)),refs=fileURLToPath(new URL('../../concepts/world/environments-v3/',import.meta.url));
const rows=[['garden','Верхние сады'],['quarantine','Тихая свалка'],['core','Корневой лес'],['nursery','Заросший город'],['mother','Роевой питомник']];
const targetLayers=[],actualLayers=[];
for(const [i,[id,name]] of rows.entries()){
 const left=i*324;
 const label=Buffer.from(`<svg width="324" height="56"><rect width="324" height="56" fill="#17201e"/><text x="12" y="35" fill="#eef0e8" font-size="20" font-family="Arial">${name}</text></svg>`);
 const ref=await sharp(refs+id+'-target-v1.png').resize(312,675,{fit:'contain',background:'#17201e'}).png().toBuffer();
 const actual=await sharp(base+'targets-'+id+'-v3-390.png').resize(312,675,{fit:'contain',background:'#17201e'}).png().toBuffer();
 targetLayers.push({input:label,left,top:0},{input:ref,left:left+6,top:56});
 actualLayers.push({input:label,left,top:0},{input:actual,left:left+6,top:56});
 const proof=JSON.parse(await readFile(base+'targets-'+id+'-v3-390.json','utf8'));
 console.log(JSON.stringify({id,viewport:proof.viewport,assetErrors:proof.assetErrors,failedModels:proof.failedModels,drawCalls:proof.drawCalls,triangles:proof.triangles,textures:proof.textures}));
}
for(const [file,layers] of [['targets-five-v3.png',targetLayers],['actual-five-v3.png',actualLayers]])await sharp({create:{width:1620,height:744,channels:4,background:'#17201e'}}).composite(layers).png().toFile(base+file);
