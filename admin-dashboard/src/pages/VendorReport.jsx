import { useEffect, useState } from 'react'
import { Package, Scale, ShoppingCart, Calendar } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function VendorReport() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [reportData, setReportData] = useState(null)

  // Set default to tomorrow's date
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDeliveryDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const fetchReport = async (date) => {
    if (!date) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await api(`/admin/vendor-report?delivery_date=${date}`, { token })
      setReportData(data)
    } catch (err) {
      console.error('Failed to fetch vendor report:', err)
      setError(err.message || 'Failed to load vendor report')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e) => {
    const newDate = e.target.value
    setDeliveryDate(newDate)
    fetchReport(newDate)
  }

  const handleLoadReport = () => {
    fetchReport(deliveryDate)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2F4135]">Vendor Order Report</h1>
          <p className="text-gray-600 mt-1">View aggregated orders by delivery date</p>
        </div>
      </div>

      {/* Date Picker */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label htmlFor="delivery-date" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Delivery Date
            </label>
            <input
              type="date"
              id="delivery-date"
              value={deliveryDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#708E53]"
            />
          </div>
          <button
            onClick={handleLoadReport}
            disabled={!deliveryDate || loading}
            className="px-6 py-2 bg-[#708E53] text-white rounded-md hover:bg-[#5a7342] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load Report'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Report Content */}
      {reportData && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-[#2F4135] mt-2">
                    {reportData.total_orders}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#E9E2D5] rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-[#708E53]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Weight</p>
                  <p className="text-3xl font-bold text-[#2F4135] mt-2">
                    {reportData.total_kg} <span className="text-xl">kg</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#E9E2D5] rounded-lg flex items-center justify-center">
                  <Scale className="w-6 h-6 text-[#708E53]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-[#2F4135] mt-2">
                    {reportData.total_items}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#E9E2D5] rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#708E53]" />
                </div>
              </div>
            </div>
          </div>

          {/* Products Breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-[#2F4135]">Products Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Qty (kg)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.products.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="px-6 py-8 text-center text-gray-500">
                        No products found for this delivery date
                      </td>
                    </tr>
                  ) : (
                    reportData.products.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-[#2F4135]">
                          {product.total_qty_kg}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.products.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-6 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-6 py-3 text-sm text-right text-[#2F4135]">
                        {reportData.total_kg} kg
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Customer Instructions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-[#2F4135]">Customer Instructions</h2>
            </div>
            <div className="p-6">
              {reportData.instructions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No instructions for this delivery date</p>
              ) : (
                <div className="space-y-4">
                  {reportData.instructions.map((instruction, index) => (
                    <div key={index} className="border-l-4 border-[#708E53] bg-gray-50 p-4 rounded-r">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {instruction.customer_name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{instruction.notes}</p>
                        </div>
                        <span className="text-xs text-gray-500 ml-4">
                          Order: {instruction.order_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!reportData && !loading && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Loaded</h3>
          <p className="text-gray-500">Select a delivery date and click "Load Report" to view vendor order details</p>
        </div>
      )}
    </div>
  )
}

export default VendorReport
