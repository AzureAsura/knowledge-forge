import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import ErrorState from '@/components/ui/ErrorState'
import { ApiError, errorMessage } from '@/lib/api/errors'

export default function RouteError() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : error instanceof ApiError ? error.status : undefined

  if (status === 404) return <ErrorState title="Not found" message="We couldn't find what you were looking for." />
  if (status === 403) return <ErrorState title="Forbidden" message="You don't have access to this page." />
  return <ErrorState title="Something went wrong" message={errorMessage(error)} onRetry={() => window.location.reload()} />
}
