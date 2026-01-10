export default function Card ({ title, value, footer }) {
  return (
    <div className="rounded-2xl border border-background bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-secondary/80">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
      {footer && <p className="mt-2 text-xs text-secondary/70">{footer}</p>}
    </div>
  )
}
