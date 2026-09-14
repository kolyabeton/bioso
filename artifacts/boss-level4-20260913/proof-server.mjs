import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
const fixture=readFileSync(new URL('./runtime-fixture.js',import.meta.url),'utf8');
const server=await createServer({configFile:false,cacheDir:'temp/vite-level-four-proof',server:{host:'127.0.0.1',port:5298,strictPort:true},plugins:[{name:'local-level-four-evidence',transform(code,id){if(id.endsWith('/src/main.js'))return code+'\n'+fixture;}}]});
await server.listen();console.log('http://127.0.0.1:5298/?review=level-four-proof&lang=ru');
