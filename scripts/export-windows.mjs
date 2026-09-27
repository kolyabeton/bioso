import { cp, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const release = resolve(process.argv[2] || '');
const version = '44.4.3';
if (!process.argv[2]) throw new Error('Pass the freshly exported itch release directory');
const manifest = JSON.parse(await readFile(join(release, 'manifest.json'), 'utf8'));
const destination = join(release, 'BIOSO-Windows-x64');
await mkdir(destination);
const runtime = resolve(`temp/electron-runtime/electron-v${version}-win32-x64.zip`);
const sums = execFileSync('curl', ['-fsSL', `https://github.com/electron/electron/releases/download/v${version}/SHASUMS256.txt`], { encoding: 'utf8' });
const expected = sums.split('\n').find(line => line.endsWith(`electron-v${version}-win32-x64.zip`))?.split(/\s+/)[0];
const actual = createHash('sha256').update(await readFile(runtime)).digest('hex');
if (!expected || expected !== actual) throw new Error('Electron runtime checksum mismatch');
execFileSync('/usr/bin/unzip', ['-q', runtime, '-d', destination]);
await rename(join(destination, 'electron.exe'), join(destination, 'BIOSO.exe'));
const appDir = join(destination, 'resources', 'app');
await mkdir(appDir);
await cp(join(release, 'game'), join(appDir, 'game'), { recursive: true });
await cp(resolve('scripts/windows-main.cjs'), join(appDir, 'main.cjs'));
await writeFile(join(appDir, 'package.json'), JSON.stringify({ name: 'bioso', version: '0.2.0', main: 'main.cjs' }, null, 2));
await writeFile(join(destination, 'README.txt'), 'BIOSO — Windows x64\r\n\r\nExtract the entire ZIP, then run BIOSO.exe. Keep all included files together.\r\nF11: fullscreen. No installation or internet connection required.\r\nUnsigned build.\r\n');
const exe = await readFile(join(destination, 'BIOSO.exe'));
if (exe.toString('ascii', 0, 2) !== 'MZ' || exe.toString('ascii', exe.readUInt32LE(0x3c), exe.readUInt32LE(0x3c) + 4) !== 'PE\0\0') throw new Error('Invalid Windows executable');
if (exe.readUInt16LE(exe.readUInt32LE(0x3c) + 4) !== 0x8664) throw new Error('Not an x64 executable');
for (const entry of manifest.files) {
  const source = await readFile(join(release, 'game', entry.name));
  const target = await readFile(join(appDir, 'game', entry.name));
  if (!source.equals(target)) throw new Error(`Windows asset mismatch: ${entry.name}`);
}
const archive = join(release, 'bioso-windows-x64.zip');
execFileSync('/usr/bin/zip', ['-9', '-q', '-r', archive, 'BIOSO-Windows-x64'], { cwd: release });
execFileSync('/usr/bin/unzip', ['-tq', archive]);
const report = { archive, archiveBytes: (await stat(archive)).size, electron: version, runtimeSHA256: actual,
  gameFiles: manifest.fileCount, executableFormat: 'PE Windows x64', windowsRuntimeTest: 'not run on macOS' };
await writeFile(join(release, 'windows-manifest.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
