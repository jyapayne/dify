'use client'

import Leaderboard from '@/app/components/challenge/leaderboard'
import type { LeaderboardEntry } from './types'

type LeaderboardSectionProps = {
  leaderboard: LeaderboardEntry[]
  scoringStrategy?: string
  emptyHint: string
}

export default function LeaderboardSection({ leaderboard, scoringStrategy, emptyHint }: LeaderboardSectionProps) {
  if (leaderboard.length > 0)
    return <Leaderboard entries={leaderboard} strategy={scoringStrategy} />

  return (
    <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-6 text-sm text-text-secondary shadow-xs'>
      {emptyHint}
    </div>
  )
}
