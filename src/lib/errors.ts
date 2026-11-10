export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function normalizeError(error: unknown, fallback: string) {
  if (error instanceof Error) return error
  return new Error(errorMessage(error, fallback))
}
