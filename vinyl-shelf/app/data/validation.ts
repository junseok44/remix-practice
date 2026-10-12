import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import type { CreateAlbumInput } from './albums.ts'

const fieldNames = ['title', 'artist', 'year', 'genre', 'notes', 'rating'] as const

type FieldName = (typeof fieldNames)[number]

export type AlbumFieldErrors = Partial<Record<FieldName, string>>

export type AlbumFormValues = Record<FieldName, string>

export type CreateAlbumResult =
  | { ok: true; value: CreateAlbumInput }
  | { ok: false; errors: AlbumFieldErrors; values: AlbumFormValues }

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

// An empty box means "not rated" and stores null; anything typed must be 1-5.
const ratingField = s
  .defaulted(s.string(), '')
  .refine((value) => {
    let trimmed = value.trim()
    if (trimmed === '') return true
    let rating = Number(trimmed)
    return Number.isInteger(rating) && rating >= 1 && rating <= 5
  }, 'Rating must be a whole number from 1 to 5')
  .transform((value) => (value.trim() === '' ? null : Number(value.trim())))

export const albumFormSchema = f.object({
  title: f.field(requiredText('Title')),
  artist: f.field(requiredText('Artist')),
  year: f.field(yearField),
  genre: f.field(requiredText('Genre')),
  notes: f.field(requiredText('Notes')),
  rating: f.field(ratingField),
})

/**
 * Boundary validation for the album form. `parseSafe` keeps the failure path
 * a return value, which the actions translate into a 400 response.
 */
export function validateCreateAlbum(formData: FormData): CreateAlbumResult {
  let result = s.parseSafe(albumFormSchema, formData)

  if (!result.success) {
    let errors: AlbumFieldErrors = {}
    for (let issue of result.issues) {
      let field = issueField(issue)
      if (field && !errors[field]) errors[field] = issue.message
    }

    return { ok: false, errors, values: readValues(formData) }
  }

  return { ok: true, value: result.value }
}

function issueField(issue: s.Issue): FieldName | undefined {
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
