/**
 * Parses error responses from the API and returns a user-friendly message
 */
export function parseErrorMessage(error: any): string {
  // If it's already a clean string message
  if (typeof error === 'string' && !error.startsWith('{') && !error.startsWith('[')) {
    return error
  }

  // Try to parse JSON error responses
  try {
    let errorData = error

    // If error is a string that looks like JSON, parse it
    if (typeof error === 'string') {
      errorData = JSON.parse(error)
    }

    // Handle various API error response formats
    if (errorData?.detail) {
      // FastAPI validation errors can be arrays or strings
      if (Array.isArray(errorData.detail)) {
        // Format validation errors nicely
        return errorData.detail
          .map((err: any) => {
            if (err.msg) {
              const field = err.loc ? err.loc.join('.').replace('body.', '') : 'field'
              return `${field}: ${err.msg}`
            }
            return err.toString()
          })
          .join(', ')
      }
      
      if (typeof errorData.detail === 'string') {
        return errorData.detail
      }

      if (errorData.detail.message) {
        return errorData.detail.message
      }
    }

    if (errorData?.message) {
      return errorData.message
    }

    if (errorData?.error) {
      return errorData.error
    }

    // If we have an object but can't find a message field, stringify it
    return JSON.stringify(errorData)
  } catch {
    // If parsing fails, return the original error or a generic message
    if (error?.message) {
      return error.message
    }
    return typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Fetches from the API and throws formatted errors
 */
export async function fetchWithError(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    const errorMessage = parseErrorMessage(errorText)
    throw new Error(errorMessage)
  }
  
  return response
}
