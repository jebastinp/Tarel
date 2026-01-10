import { useCallback, useEffect, useState } from 'react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { exportToCsv } from '../utils/exportCsv'

const emptyForm = { name: '', slug: '', description: '' }

export default function Categories() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [initialising, setInitialising] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busyCategory, setBusyCategory] = useState('')
  const [deletingCategory, setDeletingCategory] = useState('')

  const fetchCategories = useCallback(async () => {
    if (!token) return []
    const response = await api('/admin/categories', { token })
    const list = Array.isArray(response) ? response : []
    setCategories(list)
    return list
  }, [token])

  useEffect(() => {
    if (!token) return
    let alive = true

    const load = async () => {
      setInitialising(true)
      setError('')
      setFeedback('')
      try {
        await fetchCategories()
      } catch (err) {
        if (!alive) return
        console.error('Failed to load categories', err)
        const message = err instanceof Error ? err.message : 'Unable to load categories.'
        setError(message)
      } finally {
        if (alive) {
          setInitialising(false)
        }
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [token, fetchCategories])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    setError('')
    setFeedback('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null
      }
      if (!payload.name || !payload.slug) {
        setError('Name and slug are required.')
        return
      }

      await api('/admin/categories', {
        method: 'POST',
        token,
        body: payload
      })
      setFeedback('Category created successfully.')
      setForm(emptyForm)
      await fetchCategories()
    } catch (err) {
      console.error('Failed to create category', err)
      const message = err instanceof Error ? err.message : 'Unable to create category.'
      setError(message)
    }
  }

  const handleToggle = async (category) => {
    if (!token) return
    setError('')
    setFeedback('')
    setBusyCategory(category.id)
    try {
      await api(`/admin/categories/${category.id}`, {
        method: 'PATCH',
        token,
        body: { is_active: !category.is_active }
      })
      setFeedback(`Category ${category.is_active ? 'deactivated' : 'activated'} successfully.`)
      await fetchCategories()
    } catch (err) {
      console.error('Failed to update category', err)
      const message = err instanceof Error ? err.message : 'Unable to update category.'
      setError(message)
    } finally {
      setBusyCategory('')
    }
  }

  const handleDelete = async (category) => {
    if (!token) return
    if (!window.confirm(`Delete category "${category.name}"? This action cannot be undone.`)) {
      return
    }
    setError('')
    setFeedback('')
    setDeletingCategory(category.id)
    try {
      await api(`/admin/categories/${category.id}`, {
        method: 'DELETE',
        token
      })
      setFeedback('Category deleted successfully.')
      await fetchCategories()
    } catch (err) {
      console.error('Failed to delete category', err)
      const message = err instanceof Error ? err.message : 'Unable to delete category.'
      setError(message)
    } finally {
      setDeletingCategory('')
    }
  }

  if (authLoading || initialising) {
    return <Loading message="Loading categories…" />
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
      <Header title="Category Management" />
      <section className="flex-1 space-y-6 bg-background px-4 py-6 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-3xl border border-background bg-white p-4 shadow sm:p-6 md:grid-cols-[2fr_2fr_3fr_auto]"
        >
          <input
            required
            placeholder="Category name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <input
            required
            placeholder="Slug"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-background transition hover:bg-primary"
          >
            Add
          </button>
          {(error || feedback) && (
            <p className={`text-sm md:col-span-4 ${error ? 'text-red-600' : 'text-secondary'}`}>
              {error || feedback}
            </p>
          )}
        </form>

        <div className="overflow-x-auto rounded-3xl border border-background bg-white shadow">
          <div className="flex flex-col gap-3 border-b border-background/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-secondary">All categories</p>
            <button
              onClick={() => exportToCsv('categories.csv', categories)}
              className="inline-flex items-center justify-center rounded-full border border-secondary px-4 py-2 text-xs font-medium text-secondary transition hover:bg-secondary hover:text-background"
            >
              Export CSV
            </button>
          </div>
          <table className="min-w-[640px] divide-y divide-background/70">
            <thead className="bg-secondary text-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background/70">
              {categories.map((category) => (
                <tr key={category.id} className="text-sm text-primary">
                  <td className="px-4 py-3">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-secondary/80">{category.description}</p>
                  </td>
                  <td className="px-4 py-3">/{category.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        category.is_active ? 'bg-secondary/20 text-secondary' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => handleToggle(category)}
                        disabled={busyCategory === category.id || deletingCategory === category.id}
                        className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyCategory === category.id
                          ? 'Updating…'
                          : category.is_active
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        disabled={busyCategory === category.id || deletingCategory === category.id}
                        className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingCategory === category.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && <p className="p-6 text-center text-sm text-secondary">No categories yet.</p>}
        </div>
      </section>
    </div>
  )
}
