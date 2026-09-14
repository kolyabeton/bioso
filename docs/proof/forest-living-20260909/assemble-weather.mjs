import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('.',import.meta.url));
const entries=[['garden','Сады · солнце'],['forest','Лес · дымка'],['scrap','Свалка · пыль'],['city','Город · дождь'],['mother','Питомник · сумрак']];
const w=260,h=563,gap=10,layers=[],summary=[];
for(const [i,[id,title]] of entries.entries()){
 const name=`weather-final-${id}-390`,m=JSON.parse(await readFile(dir+name+'.json','utf8')).current;
 if(m.viewport.width!==390||m.viewport.height!==844||m.loadingTiles||m.assetErrors||m.errors.length)throw Error('Incomplete proof: '+id);
 const left=gap+i*(w+gap);
 layers.push({input:Buffer.from(`<svg width="${w}" height="40"><text x="8" y="27" fill="#e3e5dc" font-family="Arial" font-size="18">${title}</text></svg>`),left,top:0});
 layers.push({input:await sharp(dir+name+'.png').resize(w,h).png().toBuffer(),left,top:40});
 summary.push({id,route:m.route,weather:m.weather,weatherBlend:m.weatherBlend,weatherParticles:m.weatherParticles,drawCalls:m.drawCalls,triangles:m.triangles,textures:m.textures,errors:m.errors});
}
await sharp({create:{width:entries.length*(w+gap)+gap,height:h+50,channels:4,background:'#222923'}}).composite(layers).png().toFile(dir+'weather-all-five.png');
const crossing=JSON.parse(await readFile(dir+'weather-survival-crossing.json','utf8'));
const samples=crossing.samples.map(s=>({t:s.activeSeconds,z:s.player.z,weather:s.weather,gardens:s.weatherBlend['upper-gardens'],scrap:s.weatherBlend['quiet-scrapyard']}));
if(crossing.current.mode!=='survival'||crossing.current.player.z<40||crossing.current.weatherBlend['quiet-scrapyard']<.99||crossing.current.errors.length)throw Error('Crossing did not complete');
await writeFile(dir+'weather-summary.json',JSON.stringify({environments:summary,crossing:samples},null,2));
console.log(summary.map(s=>({id:s.id,weather:s.weather,particles:s.weatherParticles,draws:s.drawCalls})));
