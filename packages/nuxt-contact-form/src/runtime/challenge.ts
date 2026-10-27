interface Turnstile {
 render(el: HTMLElement, options: {sitekey: string; action: string; callback(token: string): void; 'expired-callback'(): void; 'error-callback'(): void}): string
 remove(id: string): void
}
let loading: Promise<Turnstile> | undefined
function service(): Turnstile | undefined {
 return (window as unknown as {turnstile?: Turnstile}).turnstile
}
export function challenge(element: HTMLElement, sitekey: string, update: (token: string) => void): () => void {
 let active = true
 let widget: string | undefined
 loading ??= new Promise<Turnstile>((resolve, reject) => {
  if (service()) { resolve(service()!); return }
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  script.async = true
  script.referrerPolicy = 'no-referrer'
  const timer = setTimeout(() => reject(new Error('challenge_unavailable')), 10000)
  script.onload = () => { clearTimeout(timer); service() ? resolve(service()!) : reject(new Error('challenge_unavailable')) }
  script.onerror = () => { clearTimeout(timer); reject(new Error('challenge_unavailable')) }
  document.head.append(script)
 })
 void loading.then(api => {
  if (!active) return
  widget = api.render(element, {sitekey, action: 'contact', callback: token => { if (active) update(token) }, 'expired-callback': () => update(''), 'error-callback': () => update('')})
 }).catch(() => { if (active) update('') })
 return () => { active = false; update(''); if (widget) service()?.remove(widget) }
}
