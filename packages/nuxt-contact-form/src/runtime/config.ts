export interface ModuleOptions {
 mode: 'preview' | 'live'
 endpoint: string
 siteKey: string
 turnstileSiteKey: string
 policyVersion: string
 privacyUrl: string
}
export const defaultOptions: ModuleOptions = {
 mode: 'preview', endpoint: '', siteKey: '', turnstileSiteKey: '', policyVersion: '', privacyUrl: ''
}

export function validPrivacyUrl(value: string): boolean {
 if (!/^(\/(?!\/)|https:\/\/)/.test(value) || /[\u0000-\u0020\u007f]/.test(value)) return false
 try { const url = new URL(value, 'https://privacy.invalid'); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}

/** Whitelist public fields: unknown keys (including mistaken secrets) fail at build time. */
export function publicOptions(input: unknown): ModuleOptions {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid contact form configuration')
 const fields = input as Record<string, unknown>
 if (Object.keys(fields).some(key => !Object.hasOwn(defaultOptions, key))) throw new Error('Unknown contact form option; secrets must remain server-side')
 const options = {...defaultOptions}
 for (const key of Object.keys(defaultOptions) as (keyof ModuleOptions)[]) {
  if (fields[key] !== undefined && typeof fields[key] !== 'string') throw new Error('Invalid contact form option')
 }
 Object.assign(options, fields)
 if (!['preview', 'live'].includes(options.mode)) throw new Error('Invalid contact form mode')
 if (options.mode === 'live') {
  const url = new URL(options.endpoint)
  if (url.protocol !== 'https:' || url.pathname !== '/v1/submissions' || url.search || url.hash || url.username || url.password || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(options.siteKey) || !options.turnstileSiteKey || !/^urn:coela:legal:[A-Za-z0-9:.\-]+@[0-9a-f]{40}$/.test(options.policyVersion) || options.policyVersion.length > 160 || !validPrivacyUrl(options.privacyUrl)) throw new Error('Incomplete contact form configuration')
 }
 return options
}
