import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
const server=await createServer({configFile:false,cacheDir:'temp/vite-boss-families-proof',server:{host:'127.0.0.1',port:5298,strictPort:true},plugins:[{name:'local-boss-families-evidence',transform(code,id){if(id.endsWith('/src/main.js'))return code+'\n'+readFileSync(new URL('./runtime-fixture.js',import.meta.url),'utf8');}}]});
await server.listen();console.log('http://127.0.0.1:5298/?review=boss-families-proof&boss=4');
