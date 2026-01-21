import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedOutlet from './components/ProtectedOutlet'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Products from './pages/Products'
import OrderDetails from './pages/OrderDetails'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Categories from './pages/Categories'
import Purchase from './pages/Purchase'
import VendorReport from './pages/VendorReport'
import CutCleanOptions from './pages/CutCleanOptions'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />

      <Route element={<ProtectedOutlet />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminLayout>
              <OrderDetails />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminLayout>
              <Products />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminLayout>
              <Categories />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/cut-clean-options"
          element={
            <AdminLayout>
              <CutCleanOptions />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <AdminLayout>
              <Customers />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/purchase"
          element={
            <AdminLayout>
              <Purchase />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/vendor-report"
          element={
            <AdminLayout>
              <VendorReport />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminLayout>
              <Reports />
            </AdminLayout>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
}
