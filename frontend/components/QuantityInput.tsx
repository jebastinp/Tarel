'use client'

import { useState } from 'react'

export default function QuantityInput({
  onChange,
  min = 1,
  defaultValue = 1,
}: {
  onChange: (value: number) => void
  min?: number
  defaultValue?: number
}) {
  const [value, setValue] = useState(defaultValue)

  const update = (v: number) => {
    const next = Math.max(min, v)
    setValue(next)
    onChange(next)
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button className="btn" type="button" onClick={() => update(value - 1)}>-</button>
      <span className="w-8 text-center">{value}</span>
      <button className="btn" type="button" onClick={() => update(value + 1)}>+</button>
    </div>
  )
}
