// Generates disabled Text-variable examples; never reads credentials or deploys.
import {readFile} from 'node:fs/promises'
const sites=JSON.parse(await readFile(new URL('../config/sites.example.json',import.meta.url),'utf8'))
console.log(JSON.stringify({CONTACT_ACCEPTING:'false',CONTACT_SITES_JSON:JSON.stringify(sites),CONTACT_NETWORK_JSON:'{}',CONTACT_SITE_NETWORKS_JSON:'{}'},null,2))
