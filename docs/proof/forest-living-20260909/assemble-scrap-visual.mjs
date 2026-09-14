import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('.',import.meta.url));
const entries=[['../../concepts/world/environments-v3/quarantine-target-v1.png','Референс'],['scrap-visual-v7-390.png','Выживание — текущая игра']];
const layers=[];
for(const [i,[file,label]]of entries.entries()){
 layers.push({input:await sharp(dir+file).resize(390,844).png().toBuffer(),left:12+i*402,top:52});
 layers.push({input:Buffer.from(`<svg width="390" height="52"><text x="10" y="33" fill="#e6e8dc" font-family="Arial" font-size="21">${label}</text></svg>`),left:12+i*402,top:0});
}
await sharp({create:{width:816,height:908,channels:4,background:'#202723'}}).composite(layers).png().toFile(dir+'scrap-reference-vs-game-v7.png');
