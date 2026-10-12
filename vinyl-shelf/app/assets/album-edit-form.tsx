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

type FieldName = 'title' | 'artist' | 'year' | 'genre' | 'notes' | 'rating'

interface AlbumEditFormProps extends SerializableProps {
  /** The same URL the non-enhanced form posts to. */
  actionHref: string
  values: Record<FieldName, string>
  errors: Partial<Record<FieldName, string>>
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

    return () => (
      <form
        method="post"
        action={handle.props.actionHref}
        mix={[
          formStyle,
          on('submit', async (event, signal) => {
            let form = event.currentTarget
            event.preventDefault()

            pending = true
            formError = undefined
            fieldErrors = {}
            handle.update()

            try {
              let response = await fetch(form.action, {
                body: new FormData(form),
                method: form.method,
                headers: { Accept: 'application/json' },
                signal,
              })

              if (signal.aborted) return

              if (response.ok) {
                // The action answered with a redirect, which fetch followed.
                // Follow the controller's destination instead of guessing one.
                await navigate(response.url, { history: 'replace' })
                return
              }

              if (response.status === 400) {
                let payload = (await response.json()) as {
                  errors: Partial<Record<FieldName, string>>
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

        <Field
          name="rating"
          label="Rating (1-5, optional)"
          value={handle.props.values.rating}
          error={fieldErrors.rating}
        />

        <button
          type="submit"
          class="shelf-cta"
          disabled={pending}
          mix={button({ tone: 'primary', size: 'lg' })}
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    )
  },
)

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

const errorStyle = css({ color: 'var(--shelf-danger)', fontWeight: 700 })
