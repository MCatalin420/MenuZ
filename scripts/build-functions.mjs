import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['functions/index.ts'],outfile:resolve(root,'functions/lib/index.js'),bundle:true,platform:'node',target:'node22',format:'cjs',packages:'external'});
