import {readFile,stat,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const release=resolve(process.argv[2]);
const manifest=JSON.parse(await readFile(join(release,'manifest.json'),'utf8'));
const extracted=join(release,'verified-extracted');
await mkdir(extracted);
execFileSync('unzip',['-q',manifest.archive,'-d',extracted]);
const entries=execFileSync('unzip',['-Z1',manifest.archive],{encoding:'utf8'}).trim().split('\n').filter(p=>!p.endsWith('/')).sort();
if(JSON.stringify(entries)!==JSON.stringify(manifest.files.map(f=>f.name).sort()))throw Error('ZIP/manifest file list mismatch');
for(const f of manifest.files){if((await stat(join(extracted,f.name))).size!==f.bytes)throw Error('Size mismatch '+f.name);}
const assets=JSON.parse(await readFile(join(extracted,'asset-manifest.json'),'utf8'));
for(const f of [...assets.entries,...assets.generated]){
 const b=await readFile(join(extracted,f.url.replace(/^\//,'')));
 if(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.hash)throw Error('Asset mismatch '+f.url);
}
const previous=resolve('outputs/itch/bioso-20260918T122842Z/bioso-html5-compressed.zip');
const oldEntries=execFileSync('unzip',['-Z1',previous],{encoding:'utf8'}).trim().split('\n').filter(p=>!p.endsWith('/'));
const previousBytes=(await stat(previous)).size;
const report={archive:manifest.archive,archiveBytes:manifest.archiveBytes,previousBytes,deltaBytes:manifest.archiveBytes-previousBytes,
 files:entries.length,assets:[...assets.entries,...assets.generated].length,manifestHashes:'PASS',rootIndex:entries.includes('index.html'),
 added:entries.filter(p=>!oldEntries.includes(p)),removed:oldEntries.filter(p=>!entries.includes(p)),extracted};
await writeFile(join(release,'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
