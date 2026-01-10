import { useEffect, useState } from 'react'

import Header from '../components/Header'
import { supabase } from '../supabaseClient'
import { exportToCsv } from '../utils/exportCsv'

export default function Users () {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false })
    setUsers(data || [])
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Customers" />
      <section className="flex-1 space-y-6 bg-background px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary">View registered customers and admins.</p>
          <button
            onClick={() => exportToCsv('users.csv', users)}
            className="inline-flex items-center justify-center rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-background bg-white shadow">
          <table className="min-w-[640px] divide-y divide-background/60">
            <thead className="bg-secondary text-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background/60 text-sm text-primary">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-6 text-center text-sm text-secondary">No customers yet.</p>}
        </div>
      </section>
    </div>
  )
}
