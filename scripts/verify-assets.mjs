import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
import {verifyAssets} from './asset-build/verify.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const report=await verifyAssets(root,join(root,'dist'));
await mkdir(join(root,'temp'),{recursive:true});
await writeFile(join(root,'temp','asset-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
