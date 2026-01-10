import { Navigate, Outlet, useLocation } from 'react-router-dom'

import Loading from './Loading'
import { useAuth } from '../context/AuthContext'

export default function ProtectedOutlet() {
  const { loading, token, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading message="Preparing admin workspace…" />
  }

  if (!token) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location, message: error || 'Sign in to continue.' }}
      />
    )
  }

  return <Outlet />
}
