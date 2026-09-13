/**
 * Both album controllers answer the same failed validation two ways: the
 * hydrated forms ask for JSON so they can show errors in place, and a plain
 * browser submission gets the HTML page back. The test lives in one module so
 * the two routes cannot drift into different rules.
 */
export function wantsJson(request: Request) {
  return request.headers.get('Accept')?.includes('application/json') ?? false
}
