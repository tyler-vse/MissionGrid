/**
 * Turn an unknown thrown value into a human-readable string, never "[object Object]".
 * Handles: Error instances, strings, and Supabase-shaped error objects
 * ({ message }, { error_description }, { error: { message } }).
 */
export function formatUnknownError(err: unknown): string {
  if (err == null) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>

    const directMessage = obj.message ?? obj.error_description ?? obj.msg
    if (typeof directMessage === 'string' && directMessage.length > 0) {
      return directMessage
    }

    const nested = obj.error
    if (nested && typeof nested === 'object') {
      const nestedMessage = (nested as Record<string, unknown>).message
      if (typeof nestedMessage === 'string' && nestedMessage.length > 0) {
        return nestedMessage
      }
    } else if (typeof nested === 'string' && nested.length > 0) {
      return nested
    }

    try {
      const json = JSON.stringify(obj)
      if (json && json !== '{}') return json
    } catch {
      /* fall through */
    }
  }

  return String(err)
}
