// Project the published maintenance package's reviewed backports into pnpm YAML.
// No patch implementation is maintained in this repository.
import {dirname,resolve} from 'node:path'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const source=dirname(fileURLToPath(import.meta.resolve('@nuxtjp/dependency-security')))
const target=resolve('.nuxtjp-security');await mkdir(target,{recursive:true})
for(const name of ['braces-3.0.3.patch','node-forge-1.4.0.patch'])await writeFile(resolve(target,name),await readFile(resolve(source,'patches',name)))
for(const name of ['LICENSE-braces','LICENSE-node-forge'])await writeFile(resolve(target,name),await readFile(resolve(source,name)))
const yaml=await readFile('pnpm-workspace.yaml','utf8')
if(!yaml.includes('patchedDependencies:'))await writeFile('pnpm-workspace.yaml',yaml+'patchedDependencies:\n  "braces@3.0.3": ".nuxtjp-security/braces-3.0.3.patch"\n  "node-forge@1.4.0": ".nuxtjp-security/node-forge-1.4.0.patch"\n')
console.log('Projected published dependency-security patches; refresh and verify the lockfile.')
