import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
const root=fileURLToPath(new URL('../',import.meta.url));
const env=parse(await readFile(resolve(root,'.env')));
for(const key of ['FIREBASE_PROJECT_ID','FIREBASE_API_KEY','FIREBASE_AUTH_DOMAIN']){
 if(!env[key]||env[key].includes('your-project'))throw new Error(`Set ${key} in .env first.`);
}
const project=env.FIREBASE_PROJECT_ID;
if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project))throw new Error('Invalid Firebase project ID.');
let current={};
try{current=JSON.parse(await readFile(resolve(root,'.firebaserc'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(current.projects?.default&&current.projects.default!==project)throw new Error('The existing Firebase default project differs from .env. Resolve this before deploying.');
await writeFile(resolve(root,'.firebaserc'),JSON.stringify({...current,projects:{...current.projects,default:project}},null,2)+'\n');
// Copy only public settings. Never copy the service account path or Admin keys.
await writeFile(resolve(root,`functions/.env.${project}`),[
 ['MENUZ_PROJECT_ID',project],['MENUZ_WEB_API_KEY',env.FIREBASE_API_KEY],['MENUZ_AUTH_DOMAIN',env.FIREBASE_AUTH_DOMAIN],['MENUZ_STORAGE_BUCKET',env.FIREBASE_STORAGE_BUCKET??'']
].map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n');
console.log(`Firebase deployment configuration prepared for ${project}. No Admin credentials copied.`);
