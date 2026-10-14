import * as s from 'remix/data-schema'
import * as coerce from 'remix/data-schema/coerce'
import * as f from 'remix/data-schema/form-data'

import type { CreateAlbumInput } from './albums.ts'

export type AlbumFieldErrors = Partial<Record<'title' | 'artist' | 'year' | 'genre' | 'notes', string>>

export type AlbumFormValues = Record<'title' | 'artist' | 'year' | 'genre' | 'notes', string>

export type CreateAlbumResult =
  | { ok: true; value: CreateAlbumInput }
  | { ok: false; errors: AlbumFieldErrors; values: AlbumFormValues }

export type EditAlbumResult =
  /** `values` carries the submitted text as typed, for responses that re-render the form. */
  | {
      ok: true
      value: CreateAlbumInput
      values: AlbumFormValues
      intent: SaveIntent
      revision: number
    }
  | { ok: false; errors: AlbumFieldErrors; values: AlbumFormValues }

const fieldNames = ['title', 'artist', 'year', 'genre', 'notes'] as const

function requiredText(label: string) {
  return s
    .defaulted(s.string(), '')
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, `${label} is required`)
}

// The year arrives as a form string; validate it in that shape, then let the
// schema hand business logic a real number.
const yearField = s
  .defaulted(s.string(), '')
  .refine((value) => {
    let year = Number(value.trim())
    return Number.isInteger(year) && year >= 1900 && year <= 2100
  }, 'Year must be a number between 1900 and 2100')
  .transform((value) => Number(value.trim()))

const albumFields = {
  title: f.field(requiredText('Title')),
  artist: f.field(requiredText('Artist')),
  year: f.field(yearField),
  genre: f.field(requiredText('Genre')),
  notes: f.field(requiredText('Notes')),
}

export const albumFormSchema = f.object(albumFields)

export type SaveIntent = 'save' | 'save-and-continue'

/**
 * An unrecognized intent means a stale or edited form, not a typo the user can
 * fix, so it collapses to the default action instead of becoming an error.
 */
const intentField = s
  .defaulted(s.string(), 'save')
  .transform((value): SaveIntent => (value === 'save-and-continue' ? 'save-and-continue' : 'save'))

// A missing revision lands on 0, which matches no stored album, so the action
// answers with a conflict instead of writing blind.
const revisionField = s.defaulted(coerce.number(), 0).transform((value) => Math.trunc(value))

export const albumEditFormSchema = f.object({
  ...albumFields,
  intent: f.field(intentField),
  revision: f.field(revisionField),
})

export type DeleteIntent = 'delete' | 'delete-anyway'

// Unknown values fall back to the guarded delete: a stale or edited form must
// never turn into the one intent that skips the revision check.
const deleteIntentField = s
  .defaulted(s.string(), 'delete')
  .transform((value): DeleteIntent => (value === 'delete-anyway' ? 'delete-anyway' : 'delete'))

const deleteRevisionField = s
  .defaulted(s.string(), '')
  .transform((value) => {
    let revision = Number(value.trim())
    return Number.isInteger(revision) ? revision : 0
  })

export const albumDeleteFormSchema = f.object({
  intent: f.field(deleteIntentField),
  revision: f.field(deleteRevisionField),
})

/**
 * The delete form has no field a user could fix, so it cannot fail: anything
 * unreadable becomes a guarded delete against revision 0, which answers 409.
 */
export function validateDeleteAlbum(formData: FormData): { intent: DeleteIntent; revision: number } {
  let result = s.parseSafe(albumDeleteFormSchema, formData)
  return result.success ? result.value : { intent: 'delete', revision: 0 }
}

/**
 * Boundary validation for the album form. `parseSafe` keeps the failure path
 * a return value, which the actions translate into a 400 response.
 */
export function validateCreateAlbum(formData: FormData): CreateAlbumResult {
  let result = s.parseSafe(albumFormSchema, formData)

  if (!result.success) {
    return { ok: false, errors: collectFieldErrors(result.issues), values: readValues(formData) }
  }

  return { ok: true, value: result.value }
}

/**
 * The edit form carries two extra hidden values: which button was pressed, and
 * the revision the form was built from. Both belong to the same boundary parse
 * as the album fields.
 */
export function validateEditAlbum(formData: FormData): EditAlbumResult {
  let result = s.parseSafe(albumEditFormSchema, formData)

  if (!result.success) {
    return { ok: false, errors: collectFieldErrors(result.issues), values: readValues(formData) }
  }

  let { intent, revision, ...value } = result.value
  return { ok: true, value, values: readValues(formData), intent, revision }
}

function collectFieldErrors(issues: readonly s.Issue[]): AlbumFieldErrors {
  let errors: AlbumFieldErrors = {}
  for (let issue of issues) {
    let field = issueField(issue)
    if (field && !errors[field]) errors[field] = issue.message
  }
  return errors
}

function issueField(issue: s.Issue): (typeof fieldNames)[number] | undefined {
  let segment = issue.path?.[0]
  let key = typeof segment === 'object' && segment !== null ? segment.key : segment
  return fieldNames.find((name) => name === key)
}

// Failed submissions re-render with what the user typed, untouched.
function readValues(formData: FormData): AlbumFormValues {
  let values = {} as AlbumFormValues
  for (let name of fieldNames) {
    let value = formData.get(name)
    values[name] = typeof value === 'string' ? value.trim() : ''
  }
  return values
}
