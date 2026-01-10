import { useCallback, useEffect, useMemo, useState } from 'react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { exportToCsv } from '../utils/exportCsv'

const emptyForm = {
  name: '',
  slug: '',
  price_per_kg: '',
  stock_kg: '',
  category_id: '',
  description: '',
  image_url: '',
  is_active: true,
  is_dry: false
}

const numberOrNull = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export default function Products() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [initialising, setInitialising] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busyProductId, setBusyProductId] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const hasCategories = useMemo(() => categories.length > 0, [categories])

  const fetchProducts = useCallback(async () => {
    if (!token) return []
    const response = await api('/admin/products', { token })
    const list = Array.isArray(response) ? response : []
    setProducts(list)
    return list
  }, [token])

  const fetchCategories = useCallback(async () => {
    if (!token) return []
    const response = await api('/admin/categories', { token })
    const list = Array.isArray(response) ? response : []
    setCategories(list)
    return list
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setInitialising(true)
      setError('')
      setFeedback('')
      try {
        await Promise.all([fetchProducts(), fetchCategories()])
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load products', err)
          const message = err instanceof Error ? err.message : 'Unable to load products.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setInitialising(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token, fetchProducts, fetchCategories])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const mapFormFromProduct = (product) => ({
    name: product.name ?? '',
    slug: product.slug ?? '',
    price_per_kg: product.price_per_kg != null ? String(product.price_per_kg) : '',
    stock_kg: product.stock_kg != null ? String(product.stock_kg) : '',
    category_id: product.category_id != null ? String(product.category_id) : '',
    description: product.description ?? '',
    image_url: product.image_url ?? '',
    is_active: Boolean(product.is_active),
    is_dry: Boolean(product.is_dry)
  })

  const startEdit = (product) => {
    setEditingId(product.id)
    setForm(mapFormFromProduct(product))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return

    setSubmitting(true)
    setError('')
    setFeedback('')

    const imageUrl = form.image_url.trim() || null

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      price_per_kg: numberOrNull(form.price_per_kg),
      stock_kg: numberOrNull(form.stock_kg),
      category_id: form.category_id ? form.category_id.trim() : null,
      image_url: imageUrl,
      is_active: Boolean(form.is_active),
      is_dry: Boolean(form.is_dry)
    }

    if (!payload.name || !payload.slug || payload.price_per_kg == null || payload.stock_kg == null || !payload.category_id) {
      setError('Please complete all required fields with valid values.')
      setSubmitting(false)
      return
    }

    try {
      if (editingId) {
        await api(`/admin/products/${editingId}`, {
          method: 'PATCH',
          token,
          body: payload
        })
        setFeedback('Product updated successfully.')
      } else {
        await api('/admin/products', {
          method: 'POST',
          token,
          body: payload
        })
        setFeedback('Product added successfully.')
      }

      await fetchProducts()
      if (!editingId) {
        resetForm()
      }
    } catch (err) {
      console.error('Failed to save product', err)
      const message = err instanceof Error ? err.message : 'Unable to save product.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUpload = async (event) => {
    if (!token) return
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Images must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    setUploadingImage(true)
    setError('')
    setFeedback('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await api('/admin/products/upload-image', {
        method: 'POST',
        token,
        body: formData
      })

      if (result?.url) {
        setForm((prev) => ({ ...prev, image_url: result.url }))
        setFeedback('Image uploaded and linked to this product.')
      }
    } catch (err) {
      console.error('Failed to upload image', err)
      const message = err instanceof Error ? err.message : 'Unable to upload image.'
      setError(message)
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleToggleStatus = async (product) => {
    if (!token) return
    setError('')
    setFeedback('')
    setBusyProductId(product.id)
    try {
      await api(`/admin/products/${product.id}`, {
        method: 'PATCH',
        token,
        body: { is_active: !product.is_active }
      })
      await fetchProducts()
      setFeedback(`Product ${product.is_active ? 'deactivated' : 'activated'} successfully.`)
    } catch (err) {
      console.error('Failed to toggle product state', err)
      const message = err instanceof Error ? err.message : 'Unable to update product status.'
      setError(message)
    } finally {
      setBusyProductId(null)
    }
  }

  const handleDelete = async (product) => {
    if (!token) return
    const confirmed = window.confirm(`Delete ${product.name}? This cannot be undone.`)
    if (!confirmed) return
    setError('')
    setFeedback('')
    setBusyProductId(product.id)
    try {
      await api(`/admin/products/${product.id}`, {
        method: 'DELETE',
        token
      })
      await fetchProducts()
      if (editingId === product.id) {
        resetForm()
      }
      setFeedback('Product deleted successfully.')
    } catch (err) {
      console.error('Failed to delete product', err)
      const message = err instanceof Error ? err.message : 'Unable to delete product.'
      setError(message)
    } finally {
      setBusyProductId(null)
    }
  }

  const handleExport = () => {
    const rows = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name ?? '',
      price_per_kg: product.price_per_kg,
      stock_kg: product.stock_kg,
      is_active: product.is_active,
      is_dry: product.is_dry,
      image_url: product.image_url ?? '',
      description: product.description ?? ''
    }))
    exportToCsv('products.csv', rows)
  }

  if (authLoading || initialising) {
    return <Loading message="Loading products…" />
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-primary">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Admin session required</h1>
          <p className="mt-3 text-sm text-primary/70">
            {authError || 'Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in your environment to enable automatic dashboard access.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Manage Products" />
      <section className="flex-1 space-y-6 bg-background px-4 py-6 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-3xl border border-background bg-white p-4 shadow sm:p-6 md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-primary">
              {editingId ? 'Edit product' : 'Add new product'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-secondary px-4 py-2 text-xs font-medium text-secondary transition hover:bg-secondary hover:text-background"
              >
                Cancel editing
              </button>
            )}
          </div>
          <input
            required
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <input
            required
            placeholder="Slug (kebab-case)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <input
            required
            type="number"
            step="0.1"
            min="0"
            placeholder="Price per kg (£)"
            value={form.price_per_kg}
            onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <input
            required
            type="number"
            step="0.1"
            min="0"
            placeholder="Stock (kg)"
            value={form.stock_kg}
            onChange={(e) => setForm({ ...form, stock_kg: e.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
            disabled={!hasCategories}
          >
            <option value="">{hasCategories ? 'Select category' : 'Create a category first'}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="space-y-3 rounded-2xl border border-secondary/30 px-4 py-3 text-sm text-primary/80 md:col-span-2 lg:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Product image
            </span>
            <div className="rounded-xl border border-dashed border-secondary/30 p-4 text-xs text-primary/70">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-secondary/20 px-3 py-3 text-center text-xs font-semibold text-secondary transition hover:bg-secondary/10">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {uploadingImage ? 'Uploading…' : 'Upload file'}
                <span className="text-[10px] font-normal text-primary/50">PNG, JPG, WEBP, or GIF · max 5 MB</span>
              </label>
            </div>
            <p className="text-xs text-primary/50">
              Uploaded files are stored locally by the FastAPI backend and served from <code className="rounded bg-primary/5 px-1">/media/products</code>.
            </p>
            {form.image_url && (
              <p className="text-xs">
                Current image:{' '}
                <a href={form.image_url} target="_blank" rel="noreferrer" className="text-secondary underline">
                  View
                </a>
              </p>
            )}
          </div>
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="h-full rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none md:col-span-2 lg:col-span-3"
          />
          <label className="flex items-center gap-2 rounded-2xl border border-secondary/30 px-4 py-3 text-sm text-primary/80">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-secondary/40 text-secondary focus:ring-secondary"
            />
            Active
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-secondary/30 px-4 py-3 text-sm text-primary/80">
            <input
              type="checkbox"
              checked={form.is_dry}
              onChange={(e) => setForm({ ...form, is_dry: e.target.checked })}
              className="h-4 w-4 rounded border-secondary/40 text-secondary focus:ring-secondary"
            />
            Dry goods
          </label>
          <div className="flex flex-col gap-3 pt-2 md:col-span-2 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting || (!hasCategories && !editingId)}
                className={`rounded-full px-6 py-3 text-sm font-semibold text-background transition ${
                  submitting || (!hasCategories && !editingId)
                    ? 'bg-secondary/50 cursor-not-allowed'
                    : 'bg-secondary hover:bg-primary'
                }`}
              >
                {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-full border border-secondary px-4 py-2 text-xs font-medium text-secondary transition hover:bg-secondary hover:text-background"
              >
                Export CSV
              </button>
            </div>
            {feedback && <p className="text-xs font-medium text-secondary">{feedback}</p>}
          </div>
          {error && (
            <p className="text-sm text-red-600 md:col-span-2 lg:col-span-3">{error}</p>
          )}
        </form>

        <div className="overflow-x-auto rounded-3xl border border-background bg-white shadow">
          <table className="min-w-[720px] divide-y divide-background/70">
            <thead className="bg-secondary text-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Price (£/kg)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Stock (kg)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Dry</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-background/70">
              {products.map((product) => (
                <tr key={product.id} className="text-sm text-primary">
                  <td className="px-4 py-3">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-secondary">/{product.slug}</p>
                    {product.image_url && (
                      <a
                        href={product.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-secondary underline"
                      >
                        View image
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">{product.category?.name || '—'}</td>
                  <td className="px-4 py-3">£{Number(product.price_per_kg ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{Number(product.stock_kg ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.is_active ? 'bg-secondary/20 text-secondary' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        product.is_dry ? 'bg-primary/10 text-primary/80' : 'bg-background text-primary/60'
                      }`}
                    >
                      {product.is_dry ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
                        onClick={() => startEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
                        onClick={() => handleToggleStatus(product)}
                        disabled={busyProductId === product.id}
                      >
                        {busyProductId === product.id ? 'Updating…' : product.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500 hover:text-background"
                        onClick={() => handleDelete(product)}
                        disabled={busyProductId === product.id}
                      >
                        {busyProductId === product.id ? 'Removing…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="p-6 text-center text-sm text-secondary">No products yet – add your first catch above.</p>
          )}
        </div>
      </section>
    </div>
  )
}
