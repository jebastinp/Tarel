import { render, screen } from '@testing-library/react'

import Home from '@/app/(public)/page'

describe('Home page', () => {
  it('renders the hero headline', () => {
    render(<Home />)
    expect(
      screen.getByRole('heading', {
        name: /Edinburgh's trusted seafood market/i,
      })
    ).toBeInTheDocument()
  })
})
