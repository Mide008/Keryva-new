// src/components/ui/UsageBadge.jsx
import { useState, useEffect } from 'react'
import { getUsage } from '@/lib/usageLimits'

export default function UsageBadge({ feature, refreshKey }) {
  const [usage, setUsage] = useState(() => getUsage(feature))
  useEffect(() => { setUsage(getUsage(feature)) }, [feature, refreshKey])
  const low = usage.remaining <= Math.ceil(usage.limit * 0.2)
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: usage.exhausted ? 'var(--terra-100)' : low ? 'var(--gold-100)' : 'var(--sage-100)',
      color: usage.exhausted ? 'var(--terra-600)' : low ? 'var(--gold-800)' : 'var(--sage-600)',
    }}>
      {usage.remaining} of {usage.limit} left today
    </span>
  )
}
