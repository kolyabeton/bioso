import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file=process.argv[2]||'proof/progression-probe-tuned.json';
const data=JSON.parse(await readFile(file,'utf8'));
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]??null;
const drift=[];for(const [path,hash]of Object.entries(data.sourceHashes||{}))if(createHash('sha256').update(await readFile(path)).digest('hex')!==hash)drift.push(path);
const rows=Object.entries({melee:'Ближняя',ranged:'Дальняя',elements:'Стихии',summons:'Симбионты',mixed:'Смешанная'}).map(([style,name])=>{const a=data.rows.filter(r=>r.style===style),at40=a.flatMap(r=>r.checkpoints.filter(c=>c.minute===40).map(c=>c.choices));return{name,runs:a.length,wins:a.filter(r=>r.won).length,reached40:at40.length,choices:at40.length?[Math.min(...at40),Math.max(...at40)]:[],firstChoice:median(a.map(r=>r.firstChoice).filter(x=>x!==null)),withinTarget:at40.filter(n=>n>=28&&n<=32).length,bossTTK:median(a.flatMap(r=>r.times.boss.n?[r.times.boss.median]:[])),finalTTK:median(a.flatMap(r=>r.times.final.n?[r.times.final.median]:[]))};});
const out={file,sourceDrift:drift,rows};await writeFile('proof/progression-summary.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
