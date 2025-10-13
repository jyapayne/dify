'use client'

import type { Translate } from './types'

type GoalCardProps = {
  goal: string
  t: Translate
}

export default function GoalCard({ goal, t }: GoalCardProps) {
  return (
    <div className='mb-6 rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
      <h2 className='mb-2 text-sm font-medium uppercase tracking-wide text-text-tertiary'>
        {t('challenges.player.goal')}
      </h2>
      <p className='text-text-primary'>{goal}</p>
    </div>
  )
}
