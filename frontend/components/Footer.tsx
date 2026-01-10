import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="py-8 text-center text-sm text-gray-600">
      © 2025 Tarel |
      <Link
        href="/legal"
        className="text-gray-600 underline-offset-2 hover:text-gray-800 hover:underline"
      >
        Legal
      </Link>
    </footer>
  )
}
