/**
 * The posting half of both enhanced album forms. It lives outside the
 * components because it is application logic rather than a description of the
 * current UI (chapter 5, section 8), and because the add and edit forms must
 * read a failed save the same way.
 *
 * The field names are redeclared here instead of imported from
 * `app/data/validation.ts`: the asset server only bundles `app/assets/**`, so
 * browser modules cannot reach the data module.
 */

export type AlbumFieldName = 'title' | 'artist' | 'year' | 'genre' | 'notes'

export type AlbumFieldErrors = Partial<Record<AlbumFieldName, string>>

export type AlbumSubmitResult =
  | { ok: true; url: string }
  | { ok: false; errors: AlbumFieldErrors; message: string }

export async function submitAlbumForm(
  form: HTMLFormElement,
  signal: AbortSignal,
): Promise<AlbumSubmitResult> {
  // Whatever the form already carries, sent as the browser would send it. The
  // one addition is `Accept`, which asks the controller for JSON so a failed
  // validation comes back as errors instead of a whole HTML page.
  let response = await fetch(form.action, {
    body: new FormData(form),
    method: form.method,
    headers: { Accept: 'application/json' },
    signal,
  })

  // The action answered with a redirect, which fetch followed. Report the
  // controller's destination rather than letting the caller guess one.
  if (response.ok) return { ok: true, url: response.url }

  if (response.status === 400) {
    let payload = (await response.json()) as { errors: AlbumFieldErrors }
    return { ok: false, errors: payload.errors, message: 'Please fix the highlighted fields.' }
  }

  return { ok: false, errors: {}, message: `Save failed with status ${response.status}` }
}
