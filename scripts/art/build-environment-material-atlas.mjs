import sharp from 'sharp';
// Format/pack approved material images; no generated scenery or object cards.
const names=['garden','scrap','city','brood'],size=1024;
const input=await Promise.all(names.map(async(name,i)=>({
 input:await sharp(`docs/art/environment-materials-v2/${name}.png`).resize(size,size).removeAlpha().toBuffer(),
 left:(i%2)*size,top:Math.floor(i/2)*size,
})));
await sharp({create:{width:size*2,height:size*2,channels:3,background:'#777777'}}).composite(input).webp({quality:90}).toFile('public/assets/biomes/environment-materials-v2.webp');
