import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('.',import.meta.url)),layers=[];
for(const [i,[file,label]] of [['hero-contact-forest-390.png','Было · около 46°'],['camera-lower-final-390.png','Стало · около 36°, ближе']].entries()){
 layers.push({input:await sharp(dir+file).resize(390,844,{fit:'contain'}).png().toBuffer(),left:12+i*402,top:48});
 layers.push({input:Buffer.from(`<svg width="390" height="48"><text x="10" y="31" fill="#e6e8dc" font-family="Arial" font-size="22">${label}</text></svg>`),left:12+i*402,top:0});
}
await sharp({create:{width:816,height:904,channels:4,background:'#202723'}}).composite(layers).png().toFile(dir+'camera-lower-before-after.png');
