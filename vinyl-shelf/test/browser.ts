import { demoPassword, shelfOwnerEmail } from '../app/data/users.ts'
import { router } from '../app/router.ts'
import { routes } from '../app/routes.ts'

/**
 * A cookie jar in front of `router.fetch`. Each instance is one browser: it
 * keeps whatever cookies the app sets and sends them back, and its `submit`
 * adds the CSRF token the way a server-rendered form would.
 */
export class Browser {
  #cookies = new Map<string, string>()

  static async signedIn(email = shelfOwnerEmail, password = demoPassword) {
    let browser = new Browser()
    let response = await browser.signIn(email, password)
    if (response.status !== 303) {
      throw new Error(`Expected sign-in to redirect, got ${response.status}`)
    }
    return browser
  }

  get cookieHeader() {
    return [...this.#cookies].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  async fetch(path: string, init: RequestInit = {}) {
    let headers = new Headers(init.headers)
    if (this.#cookies.size > 0) headers.set('Cookie', this.cookieHeader)

    let response = await router.fetch(new Request(`http://local.test${path}`, { ...init, headers }))
    this.#remember(response)
    return response
  }

  /** The token the server put in this browser's forms. */
  async csrfToken() {
    for (let path of [routes.home.href(), routes.login.index.href()]) {
      let html = await (await this.fetch(path)).text()
      let match = html.match(/name="_csrf" value="([^"]+)"/)
      if (match) return match[1]!
    }
    throw new Error('No CSRF field found on the home or login page')
  }

  async submit(path: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
    let body = new URLSearchParams({ _csrf: await this.csrfToken(), ...fields })
    return this.fetch(path, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    })
  }

  /** Like `submit`, but multipart, the way a form with a file input posts. */
  async upload(
    path: string,
    fields: Record<string, string | File | File[]>,
    headers: Record<string, string> = {},
  ) {
    let body = new FormData()
    body.append('_csrf', await this.csrfToken())
    for (let [name, value] of Object.entries(fields)) {
      for (let item of Array.isArray(value) ? value : [value]) body.append(name, item)
    }
    // No Content-Type here: Request sets multipart with its own boundary.
    return this.fetch(path, { method: 'POST', body, headers })
  }

  signIn(email: string, password: string, returnTo?: string) {
    return this.submit(routes.login.action.href(), {
      email,
      password,
      ...(returnTo ? { returnTo } : {}),
    })
  }

  #remember(response: Response) {
    for (let header of response.headers.getSetCookie()) {
      let [pair = ''] = header.split(';')
      let separator = pair.indexOf('=')
      let name = pair.slice(0, separator).trim()
      let value = pair.slice(separator + 1).trim()

      if (value === '' || /max-age=0/i.test(header)) this.#cookies.delete(name)
      else this.#cookies.set(name, value)
    }
  }
}
