'use client'

import type { AttemptResult, Translate } from './types'
import AttemptHistoryItem from './attempt-history-item'

type AttemptHistoryProps = {
  attempts: AttemptResult[]
  t: Translate
}

export default function AttemptHistory({ attempts, t }: AttemptHistoryProps) {
  return (
    <div className='mt-6 rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
      <div className='mb-3 text-sm font-medium uppercase tracking-wide text-text-tertiary'>
        {t('challenges.player.attemptHistory', 'Attempts')}
      </div>
      {attempts.length === 0 ? (
        <div className='bg-components-panel-bg/60 rounded-lg border border-divider-subtle p-4 text-sm text-text-secondary'>
          {t('challenges.player.noAttempts')}
        </div>
      ) : (
        <div className='space-y-4'>
          {attempts.map(attempt => (
            <AttemptHistoryItem key={attempt.timestamp} attempt={attempt} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
