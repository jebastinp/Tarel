import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

export default function ProtectedRoute({ children }) {
  const { loading, token, user } = useAuth()

  if (loading) {
    return <Loading message="Checking credentials…" />
  }

  if (!token || !user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
