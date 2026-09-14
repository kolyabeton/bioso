import fs from 'node:fs';
import {modelPoints,hull} from './obstacle-footprints.mjs';
import {EVENT_PRESENTATION} from '../src/gameplay-modules/event-presentation.js';

// Use the same centred, bottom-anchored normalization as the event renderer.
const profiles=Object.fromEntries([...new Set(Object.values(EVENT_PRESENTATION).map(p=>p.model))].map(model=>{
 const points=modelPoints(model);
 return [model,{hull:hull(points.map(p=>[p.x,p.z])),height:Math.max(...points.map(p=>p.y))}];
}));
const output=new URL('../src/gameplay-modules/event-footprints.json',import.meta.url);
if(process.argv.includes('--check')){
 if(JSON.stringify(JSON.parse(fs.readFileSync(output)))!==JSON.stringify(profiles))throw Error('Event footprints are stale');
}else fs.writeFileSync(output,JSON.stringify(profiles,null,2)+'\n');
console.log(`${Object.keys(profiles).length} event footprints match their GLBs`);
