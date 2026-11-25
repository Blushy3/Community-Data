import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page-container flex min-h-[60vh] flex-col justify-center py-16">
      <p className="section-eyebrow">Error 404</p>
      <h1 className="mt-3 text-3xl">This page does not exist</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-3">
        The address may be outdated or mistyped. Use the navigation above, or start
        again from the home page.
      </p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn-primary">
          Back to home
        </Link>
        <Link to="/members" className="btn-secondary">
          Browse members
        </Link>
      </div>
    </div>
  )
}

export function AccessDeniedPage() {
  return (
    <div className="page-container flex min-h-[60vh] flex-col justify-center py-16">
      <p className="section-eyebrow">Access denied</p>
      <h1 className="mt-3 text-3xl">You do not have access to this area</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-3">
        Administrative features require a community role with sufficient permissions.
        Permissions are verified by the backend, not by hiding links.
      </p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn-secondary">
          Back to home
        </Link>
        <Link to="/login" className="btn-primary">
          Sign in
        </Link>
      </div>
    </div>
  )
}
