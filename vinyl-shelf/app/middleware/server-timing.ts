import { createContextKey, type Middleware } from 'remix/router'

export const StartedAt = createContextKey<number>()

const startedAtProperty = { property: 'startedAt' } as const

export function serverTiming(): Middleware<{
  key: typeof StartedAt
  value: number
  property: 'startedAt'
}> {
  return async (context, next) => {
    // `performance.now()` is monotonic, so a clock adjustment mid-request
    // cannot produce a negative duration the way `Date.now()` can.
    let startedAt = performance.now()
    context.set(StartedAt, startedAt, startedAtProperty)

    let response = await next()
    let headers = new Headers(response.headers)
    headers.set('X-Response-Time', `${Math.round(performance.now() - startedAt)}ms`)

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  }
}
