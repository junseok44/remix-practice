import {
  clientEntry,
  css,
  navigate,
  on,
  ref,
  type Handle,
  type SerializableProps,
} from 'remix/ui'
import button from 'remix/ui/button'
import input from 'remix/ui/input'

type FieldName = 'title' | 'artist' | 'year' | 'genre' | 'notes'

interface AlbumEditFormProps extends SerializableProps {
  /** The same URL the non-enhanced form posts to. */
  actionHref: string
  values: Record<FieldName, string>
  errors: Partial<Record<FieldName | 'cover', string>>
  /** The album revision this form was built from. Submitted back as a hidden field. */
  revision: number
  /** Hydrated code cannot read server context, so the token arrives as a prop. */
  csrfToken: string
  notice?: 'saved' | 'conflict'
}

const notices = {
  saved: 'Saved. Keep editing or open the album.',
  conflict: 'Someone else saved this album first. Your text is still here — submit again to keep it.',
}

const fields: Array<{ name: FieldName; label: string }> = [
  { name: 'title', label: 'Title' },
  { name: 'artist', label: 'Artist' },
  { name: 'year', label: 'Year' },
  { name: 'genre', label: 'Genre' },
]

export const AlbumEditForm = clientEntry(
  import.meta.url,
  function AlbumEditForm(handle: Handle<AlbumEditFormProps>) {
    // UI state only. The controller still owns validation and the mutation.
    let pending = false
    let formError: string | undefined
    let fieldErrors = handle.props.errors
    let alert: HTMLElement | undefined
    // The server hands back a new revision after every successful save, so the
    // next submission from this same page is not treated as stale.
    let revision = handle.props.revision
    let notice = handle.props.notice

    return () => (
      <form
        method="post"
        action={handle.props.actionHref}
        enctype="multipart/form-data"
        mix={[
          formStyle,
          on('submit', async (event, signal) => {
            let form = event.currentTarget
            event.preventDefault()

            pending = true
            formError = undefined
            notice = undefined
            fieldErrors = {}
            handle.update()

            try {
              let response = await fetch(form.action, {
                // Passing the submitter keeps the pressed button's name/value in
                // the body. `new FormData(form)` alone drops it, and the action
                // would read every submission as the default intent.
                body: new FormData(form, event.submitter),
                method: form.method,
                headers: { Accept: 'application/json' },
                signal,
              })

              if (signal.aborted) return

              if (response.ok && isJson(response)) {
                // save-and-continue: the action stayed on this page and returned
                // the revision the next submission has to carry.
                let payload = (await response.json()) as { revision?: number }
                if (signal.aborted) return

                if (typeof payload.revision === 'number') revision = payload.revision
                // The cover is saved; keeping it selected would upload it again.
                let coverInput = form.elements.namedItem('cover')
                if (coverInput instanceof HTMLInputElement) coverInput.value = ''
                notice = 'saved'
                pending = false
                handle.update()
                return
              }

              if (response.ok) {
                // The action answered with a redirect, which fetch followed.
                // Follow the controller's destination instead of guessing one.
                await navigate(response.url, { history: 'replace' })
                return
              }

              if (response.status === 409) {
                let payload = (await response.json()) as { revision?: number }
                if (signal.aborted) return

                if (typeof payload.revision === 'number') revision = payload.revision
                notice = 'conflict'
              } else if (response.status === 401) {
                formError = 'Your session ended. Sign in again to save.'
              } else if (response.status === 403) {
                formError = 'You can only edit albums you added.'
              } else if (response.status === 413) {
                let payload = (await response.json()) as { error?: string }
                if (signal.aborted) return
                formError = payload.error ?? 'The upload is too large.'
              } else if (response.status === 400) {
                let payload = (await response.json()) as {
                  errors: Partial<Record<FieldName | 'cover', string>>
                }
                if (signal.aborted) return

                fieldErrors = payload.errors
                formError = 'Please fix the highlighted fields.'
              } else {
                formError = `Save failed with status ${response.status}`
              }

              pending = false
              // The alert only exists after this update, so wait for the DOM.
              await handle.update()
              alert?.focus()
            } catch (caught) {
              if (signal.aborted) return
              formError = caught instanceof Error ? caught.message : 'Unable to save album'
              pending = false
              handle.update()
            }
          }),
        ]}
      >
        {formError ? (
          <p role="alert" tabIndex={-1} mix={[alertStyle, ref((node) => (alert = node))]}>
            {formError}
          </p>
        ) : null}

        {notice ? (
          <p
            role="status"
            mix={notice === 'conflict' ? alertStyle : noticeStyle}
          >
            {notices[notice]}
          </p>
        ) : null}

        <input type="hidden" name="_csrf" value={handle.props.csrfToken} />
        <input type="hidden" name="revision" value={String(revision)} />

        {fields.map((field) => (
          <Field
            key={field.name}
            name={field.name}
            label={field.label}
            value={handle.props.values[field.name]}
            error={fieldErrors[field.name]}
          />
        ))}

        <NotesField value={handle.props.values.notes} error={fieldErrors.notes} />

        <CoverField error={fieldErrors.cover} />

        <div mix={actionsStyle}>
          <button
            type="submit"
            name="intent"
            value="save"
            class="shelf-cta"
            disabled={pending}
            mix={button({ tone: 'primary', size: 'lg' })}
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>

          <button
            type="submit"
            name="intent"
            value="save-and-continue"
            disabled={pending}
            mix={button({ size: 'lg' })}
          >
            Save and keep editing
          </button>
        </div>
      </form>
    )
  },
)

function isJson(response: Response) {
  return response.headers.get('Content-Type')?.includes('application/json') ?? false
}

function Field(
  handle: Handle<{ name: FieldName; label: string; value: string; error?: string }>,
) {
  return () => {
    let { name, label, value, error } = handle.props
    let errorId = `${handle.id}-error`

    return (
      <div mix={fieldStyle}>
        <label htmlFor={handle.id}>{label}</label>
        <input
          id={handle.id}
          name={name}
          defaultValue={value}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
          mix={input({ size: 'lg' })}
        />
        {error ? (
          <small id={errorId} mix={errorStyle}>
            {error}
          </small>
        ) : null}
      </div>
    )
  }
}

function NotesField(handle: Handle<{ value: string; error?: string }>) {
  return () => {
    let { value, error } = handle.props
    let errorId = `${handle.id}-error`

    return (
      <div mix={fieldStyle}>
        <label htmlFor={handle.id}>Notes</label>
        <textarea
          id={handle.id}
          name="notes"
          rows={5}
          defaultValue={value}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
        />
        {error ? (
          <small id={errorId} mix={errorStyle}>
            {error}
          </small>
        ) : null}
      </div>
    )
  }
}

function CoverField(handle: Handle<{ error?: string }>) {
  return () => {
    let { error } = handle.props
    let errorId = `${handle.id}-error`

    return (
      <div mix={fieldStyle}>
        <label htmlFor={handle.id}>Replace cover (PNG, JPEG, or WebP, up to 2 MB)</label>
        <input
          id={handle.id}
          type="file"
          name="cover"
          accept="image/png,image/jpeg,image/webp"
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
        />
        {error ? (
          <small id={errorId} mix={errorStyle}>
            {error}
          </small>
        ) : null}
      </div>
    )
  }
}

const formStyle = css({ display: 'grid', gap: '14px' })

const fieldStyle = css({
  display: 'grid',
  gap: '6px',
  '& label': { fontWeight: 800 },
  '& textarea': {
    border: '1px solid var(--shelf-field-line)',
    borderRadius: 'var(--shelf-radius-sm)',
    font: 'inherit',
    padding: '10px 12px',
  },
})

const alertStyle = css({
  background: '#fdeced',
  border: '1px solid var(--shelf-danger)',
  borderRadius: 'var(--shelf-radius-sm)',
  color: 'var(--shelf-danger)',
  fontWeight: 700,
  margin: 0,
  padding: '10px 12px',
})

const noticeStyle = css({
  background: '#eef7ee',
  border: '1px solid #3f8f4f',
  borderRadius: 'var(--shelf-radius-sm)',
  color: '#2c6b39',
  fontWeight: 700,
  margin: 0,
  padding: '10px 12px',
})

const actionsStyle = css({ display: 'flex', flexWrap: 'wrap', gap: '10px' })

const errorStyle = css({ color: 'var(--shelf-danger)', fontWeight: 700 })
