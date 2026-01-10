export default function Loading({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-primary">
      <div className="rounded-2xl bg-white px-6 py-4 text-sm font-medium shadow-lg">
        {message}
      </div>
    </div>
  )
}
