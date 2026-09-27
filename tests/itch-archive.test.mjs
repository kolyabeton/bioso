import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {packageGameZip} from '../scripts/asset-build/archive.mjs';

test('ZIP has exactly 1000 file entries without extra directories; rejects 1001',()=>{
 const root=mkdtempSync(join(tmpdir(),'bioso-zip-'));
 try {
  const game=join(root,'game');mkdirSync(join(game,'assets','nested'),{recursive:true});
  writeFileSync(join(game,'index.html'),'<main>BIOSO</main>');
  const names=['index.html'];
  for(let i=0;i<999;i++){const name=`assets/nested/${i}.txt`;names.push(name);writeFileSync(join(game,name),'asset');}
  const zip=join(root,'game.zip');assert.equal(packageGameZip(game,zip,names),1000);
  const extracted=join(root,'extracted');execFileSync('/usr/bin/unzip',['-q',zip,'-d',extracted]);
  assert.equal(execFileSync('/bin/cat',[join(extracted,'assets/nested/998.txt')],{encoding:'utf8'}),'asset');
  writeFileSync(join(game,'extra.txt'),'extra');
  assert.throws(()=>packageGameZip(game,join(root,'too-many.zip'),[...names,'extra.txt']),/1001\/1000/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
