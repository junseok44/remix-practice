import {
  FormDataParseError,
  MaxFileSizeExceededError,
  MaxFilesExceededError,
  MaxHeaderSizeExceededError,
  MaxPartsExceededError,
  MaxTotalSizeExceededError,
  MultipartParseError,
} from 'remix/form-data-parser'
import { formData } from 'remix/middleware/form-data'

import { maxCoverSize } from '../data/covers.ts'

/**
 * `formData()` with limits sized for the album forms: one cover image and a
 * handful of text fields. Every limit is checked while the body streams in,
 * so an oversized upload stops before it is held in memory.
 */
export function parseForms() {
  let parse = formData({
    maxFiles: 1,
    maxFileSize: maxCoverSize,
    maxParts: 20,
    maxHeaderSize: 8 * 1024,
    // Room for the text fields on top of one full-size cover.
    maxTotalSize: maxCoverSize + 64 * 1024,
    // A file under any other field name is dropped instead of kept in memory.
    uploadHandler(upload) {
      return upload.fieldName === 'cover' ? upload : null
    },
  })

  // Cast back to the original type so `context.formData` stays typed for
  // every controller; the wrapper only changes what a parse failure returns.
  return (async (context, next) => {
    try {
      return await parse(context, next)
    } catch (error) {
      let response = parseFailureResponse(error, context.headers.get('Accept'))
      if (response) return response
      throw error
    }
  }) as typeof parse
}

function parseFailureResponse(error: unknown, accept: string | null) {
  let status: number
  let message: string

  if (
    error instanceof MaxFileSizeExceededError ||
    error instanceof MaxTotalSizeExceededError ||
    error instanceof MaxFilesExceededError ||
    error instanceof MaxPartsExceededError ||
    error instanceof MaxHeaderSizeExceededError
  ) {
    status = 413
    message = 'The upload is too large. A cover must be one image of 2 MB or less.'
  } else if (error instanceof FormDataParseError || error instanceof MultipartParseError) {
    status = 400
    message = 'The form data could not be read.'
  } else {
    return null
  }

  if (accept?.includes('application/json')) {
    return Response.json({ error: message }, { status })
  }
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
