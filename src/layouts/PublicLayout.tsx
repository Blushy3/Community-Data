import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

/** Shared shell for every public page (README §4). */
export function PublicLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <Header />
      <main id="main-content" className="flex-1">
        <div key={location.pathname} className="animate-fade">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
