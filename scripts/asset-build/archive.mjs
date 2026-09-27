import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

// Directory entries are unnecessary: extractors create parents from file paths.
export function packageGameZip(directory, archive, expectedNames) {
  if (existsSync(archive)) throw new Error(`Archive already exists: ${archive}`);
  execFileSync('/usr/bin/zip', ['-9', '-q', '-r', '-D', archive, '.', '-x', '*/.DS_Store', '.DS_Store'], {cwd: directory});
  execFileSync('/usr/bin/unzip', ['-tq', archive]);
  const entries = execFileSync('/usr/bin/unzip', ['-Z1', archive], {encoding: 'utf8'}).trimEnd().split('\n');
  if (entries.length > 1000) throw new Error(`itch.io ZIP entry limit exceeded: ${entries.length}/1000`);
  if (entries.some(name => name.endsWith('/'))) throw new Error('Unexpected ZIP directory entry');
  if (!entries.includes('index.html')) throw new Error('Missing root index.html in ZIP');
  if (JSON.stringify([...entries].sort()) !== JSON.stringify([...expectedNames].sort())) throw new Error('ZIP entries do not match manifest');
  return entries.length;
}
