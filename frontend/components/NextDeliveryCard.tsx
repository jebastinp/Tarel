"use client"

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type { NextDeliveryInfo } from '@/lib/types'
import { useDeliveryCountdown } from '@/hooks/useDeliveryCountdown'

const OVERRIDE_CUTOFF_ISO = null // e.g. '2025-10-15T12:00:00Z'
const OVERRIDE_DELIVERY_ISO = null // e.g. '2025-10-16T08:00:00Z'

type Props = {
  nextDelivery?: NextDeliveryInfo | null
  className?: string
  showWindowLabel?: boolean
  windowLabelPlacement?: 'heading' | 'belowCountdown'
}

export function NextDeliveryCard({
  nextDelivery,
  className = '',
  showWindowLabel = false,
  windowLabelPlacement = 'heading',
}: Props) {
  const effectiveCutoff = nextDelivery?.cutoff_at ?? OVERRIDE_CUTOFF_ISO
  const effectiveDeliveryDate = nextDelivery?.scheduled_for ?? OVERRIDE_DELIVERY_ISO

  const { isActive, hasExpired, formatted, segments, cutoffDisplay } = useDeliveryCountdown(
    effectiveCutoff ?? null,
  )

  const windowLabel = useMemo(() => {
    if (!showWindowLabel) return null
    const label = nextDelivery?.window_label?.trim()
    return label && label.length > 0 ? label : null
  }, [nextDelivery?.window_label, showWindowLabel])

  const deliveryDateDisplay = useMemo(() => {
    if (!effectiveDeliveryDate) return null
    try {
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(effectiveDeliveryDate))
    } catch (err) {
      console.error('Failed to format delivery date', err)
      return effectiveDeliveryDate
    }
  }, [effectiveDeliveryDate])

  const showCountdown = Boolean(isActive && !hasExpired && formatted && segments)
  const dateAnimationKey = deliveryDateDisplay ?? (nextDelivery ? 'announcing' : 'pending')
  const dateText = deliveryDateDisplay ?? null
  const dateClassName = deliveryDateDisplay
    ? 'text-2xl font-extrabold text-brand-dark md:text-3xl'
    : 'text-sm text-brand-dark/70'

  return (
    <div
      className={`rounded-3xl border border-brand-dark/10 bg-white/85 px-5 py-5 text-brand-dark shadow-sm backdrop-blur-sm transition sm:px-7 sm:py-7 lg:px-9 ${className}`.trim()}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {windowLabel && windowLabelPlacement === 'heading' ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-dark/70">
              {windowLabel}
            </p>
          ) : null}
          {dateText ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={dateAnimationKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`${dateClassName} text-center`}
              >
                {dateText}
              </motion.p>
            </AnimatePresence>
          ) : null}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {showCountdown && segments ? (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-3"
            >
              <p className="text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-dark">
                Order within
              </p>
              {windowLabel && windowLabelPlacement === 'belowCountdown' ? (
                <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand-dark/70">
                  {windowLabel}
                </p>
              ) : null}
              <div className="flex w-full justify-center md:justify-start">
                <div className="flex flex-nowrap items-center gap-1 text-brand-dark sm:gap-1.5 md:gap-2">
                  <AnimatedSegment value={segments.days} label="D" />
                  <span className="text-xs font-semibold text-brand-dark/30 sm:text-sm md:text-base">:</span>
                  <AnimatedSegment value={segments.hours} label="H" />
                  <span className="text-xs font-semibold text-brand-dark/30 sm:text-sm md:text-base">:</span>
                  <AnimatedSegment value={segments.minutes} label="M" />
                  <span className="text-xs font-semibold text-brand-dark/30 sm:text-sm md:text-base">:</span>
                  <AnimatedSegment value={segments.seconds} label="S" />
                </div>
              </div>
              {cutoffDisplay && (
                <p className="text-center text-xs text-brand-dark/60">
                  Order by <span className="font-semibold text-brand-dark/80">{cutoffDisplay}</span>
                </p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>
    </div>
  )
}

function AnimatedSegment({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative overflow-hidden rounded-lg bg-brand-dark px-2 py-1.5 shadow-md sm:px-3 sm:py-2 md:px-3.5 md:py-2.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="block min-w-[34px] text-center font-mono text-sm tracking-tight text-white sm:min-w-[40px] sm:text-base md:min-w-[44px] md:text-lg"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-brand-dark/60 sm:text-[10px]">
        {label}
      </span>
    </div>
  )
}
