import { useEffect, useState } from 'react'

type CountdownState = {
  isActive: boolean
  hasExpired: boolean
  formatted?: string
  cutoffDisplay?: string
  segments?: {
    days: string
    hours: string
    minutes: string
    seconds: string
  }
}

export function useDeliveryCountdown(targetIso: string | null): CountdownState {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!targetIso) {
      return
    }

    const targetTime = Date.parse(targetIso)
    if (Number.isNaN(targetTime)) {
      return
    }

    setNow(Date.now())
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [targetIso])

  if (!targetIso) {
    return { isActive: false, hasExpired: false }
  }

  const targetTime = Date.parse(targetIso)
  if (Number.isNaN(targetTime)) {
    return { isActive: false, hasExpired: false }
  }

  const diffMs = targetTime - now
  const hasExpired = diffMs <= 0
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const segments = {
    days: days.toString().padStart(2, '0'),
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
  }

  let cutoffDisplay = new Date(targetTime).toLocaleString()
  try {
    cutoffDisplay = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(targetTime))
  } catch (err) {
    console.error('Failed to format cutoff time', err)
  }

  return {
    isActive: true,
    hasExpired,
    formatted: `${segments.days}:${segments.hours}:${segments.minutes}:${segments.seconds}`,
    cutoffDisplay,
    segments,
  }
}
