import {rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
// Wrangler does not remove assets from previous dry-runs. Own this output only.
await rm(new URL('../dist/worker',import.meta.url),{recursive:true,force:true})
const result=spawnSync('wrangler',['deploy','--dry-run','--outdir','dist/worker'],{stdio:'inherit',shell:false})
if(result.error)throw result.error
process.exitCode=result.status??1
