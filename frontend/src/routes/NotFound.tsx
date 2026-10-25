import ErrorState from '@/components/ui/ErrorState'

export default function NotFound() {
  return <ErrorState title="Page not found" message="The page you are looking for doesn't exist." />
}
