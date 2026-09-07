import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('nine generated GLBs have valid containers, geometry and expected socket',async()=>{
  const base=new URL('../public/assets/models/',import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
  assert.equal(manifest.length,9);
  for(const item of manifest){
    const bytes=await readFile(new URL(item.file,base));
    assert.equal(bytes.readUInt32LE(0),0x46546c67,item.name);
    assert.equal(bytes.readUInt32LE(4),2);
    assert.equal(bytes.readUInt32LE(8),bytes.length);
    assert.equal(bytes.length,item.bytes);
    assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
    const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    assert.ok(json.meshes.length>0);
    assert.ok(json.accessors.every(a=>a.count>0));
    if(item.name==='hero')assert.ok(json.nodes.some(n=>n.name==='RightArmSocket'));
  }
});
