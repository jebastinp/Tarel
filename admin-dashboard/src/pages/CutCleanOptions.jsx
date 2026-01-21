import { useCallback, useEffect, useState } from 'react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const emptyForm = {
  label: '',
  is_active: true,
  sort_order: 0
}

export default function CutCleanOptions() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [options, setOptions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [initialising, setInitialising] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busyOptionId, setBusyOptionId] = useState(null)

  const fetchOptions = useCallback(async () => {
    if (!token) return []
    const response = await api('/admin/cut-clean-options', { token })
    const list = Array.isArray(response) ? response : []
    setOptions(list)
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
        await fetchOptions()
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load options', err)
          const message = err instanceof Error ? err.message : 'Unable to load options.'
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
  }, [token, fetchOptions])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (option) => {
    setForm({
      label: option.label,
      is_active: option.is_active,
      sort_order: option.sort_order
    })
    setEditingId(option.id)
    setError('')
    setFeedback('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return

    setSubmitting(true)
    setError('')
    setFeedback('')

    try {
      const payload = {
        label: form.label.trim(),
        is_active: form.is_active,
        sort_order: Number(form.sort_order)
      }

      if (editingId) {
        await api(`/admin/cut-clean-options/${editingId}`, {
          method: 'PATCH',
          token,
          body: payload
        })
        setFeedback('Option updated successfully.')
      } else {
        await api('/admin/cut-clean-options', {
          method: 'POST',
          token,
          body: payload
        })
        setFeedback('Option created successfully.')
      }

      resetForm()
      await fetchOptions()
    } catch (err) {
      console.error('Failed to save option', err)
      const message = err instanceof Error ? err.message : 'Unable to save option.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (option) => {
    if (!token) return
    if (!confirm(`Delete "${option.label}"?`)) return

    setBusyOptionId(option.id)
    setError('')
    setFeedback('')

    try {
      await api(`/admin/cut-clean-options/${option.id}`, {
        method: 'DELETE',
        token
      })
      setFeedback('Option deleted successfully.')
      await fetchOptions()
    } catch (err) {
      console.error('Failed to delete option', err)
      const message = err instanceof Error ? err.message : 'Unable to delete option.'
      setError(message)
    } finally {
      setBusyOptionId(null)
    }
  }

  if (authLoading || initialising) {
    return <Loading />
  }

  if (authError) {
    return (
      <div>
        <Header title="Cut & Clean Options" />
        <p className="mt-4 text-sm text-red-600">{authError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Header title="Cut & Clean Options" />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">All Options ({options.length})</h2>
          
          {options.length === 0 ? (
            <p className="text-sm text-gray-500">No cut & clean options yet. Add one using the form.</p>
          ) : (
            <div className="space-y-2">
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{option.label}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          option.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {option.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Sort Order: {option.sort_order}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(option)}
                      disabled={busyOptionId === option.id}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(option)}
                      disabled={busyOptionId === option.id}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {busyOptionId === option.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-fit rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Option' : 'Add New Option'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Option Label *
              </label>
              <input
                type="text"
                required
                value={form.label}
                placeholder="e.g., Cut and Clean"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Sort Order
              </label>
              <input
                type="number"
                step="0.1"
                value={form.sort_order}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">Lower numbers appear first</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (visible to users)
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingId ? 'Update Option' : 'Add Option'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
