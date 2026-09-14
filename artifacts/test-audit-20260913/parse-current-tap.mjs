import {readFile,writeFile} from 'node:fs/promises';

const input=await readFile(new URL(`./${process.argv[2]||'full-tests-fixed-1.tap'}`,import.meta.url),'utf8');
const failures=[];
for(const block of input.match(/^not ok[^\n]*[\s\S]*?(?=^# Subtest:|^1\.\.)/gm)||[]){
 const first=block.match(/^not ok (\d+) - (.+)$/m);
 const location=block.match(/file:\/\/([^\s:)]+\.test\.mjs):(\d+):(\d+)/);
 const error=block.match(/^  error: (.+)$/m);
 const actual=block.match(/^  actual: (.+)$/m);
 const expected=block.match(/^  expected: (.+)$/m);
 failures.push({number:Number(first?.[1]),name:first?.[2],file:location?.[1],line:Number(location?.[2]),error:error?.[1],actual:actual?.[1],expected:expected?.[1]});
}
await writeFile(new URL('./failures-current.json',import.meta.url),JSON.stringify(failures,null,2));
console.log(JSON.stringify({count:failures.length,files:Object.entries(Object.groupBy(failures,f=>f.file?.split('/').at(-1))).map(([file,items])=>[file,items.length]).sort((a,b)=>b[1]-a[1])},null,2));
