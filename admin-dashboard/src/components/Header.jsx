export default function Header({ title, subtitle = 'Tarel Management Portal' }) {
  return (
    <header className="border-b border-secondary/20 bg-background px-6 py-4">
      <h1 className="text-2xl font-semibold text-primary">{title}</h1>
      <p className="text-xs uppercase tracking-[0.25em] text-secondary">{subtitle}</p>
    </header>
  )
}
