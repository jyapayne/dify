'use client'

import type { AttemptResult, Translate } from './types'

type SessionSummaryCardProps = {
  t: Translate
  attemptsTotal: number
  successCount: number
  failureCount: number
  mostRecentAttempt?: AttemptResult
}

export default function SessionSummaryCard({ t, attemptsTotal, successCount, failureCount, mostRecentAttempt }: SessionSummaryCardProps) {
  return (
    <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
      <div className='mb-3 text-sm font-medium uppercase tracking-wide text-text-tertiary'>
        {t('challenges.player.sessionSummary', 'Session Summary')}
      </div>
      <div className='space-y-3 text-sm text-text-secondary'>
        <div className='flex items-center justify-between'>
          <span>{t('challenges.player.totalAttempts', 'Total attempts')}</span>
          <span className='font-medium text-text-primary'>{attemptsTotal}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span>{t('challenges.player.successfulAttempts', 'Successful')}</span>
          <span className='font-medium text-util-colors-green-green-600'>{successCount}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span>{t('challenges.player.failedAttempts', 'Failed')}</span>
          <span className='font-medium text-util-colors-orange-orange-600'>{failureCount}</span>
        </div>
        {mostRecentAttempt && (
          <div className='bg-components-panel-bg/60 rounded-md border border-divider-subtle p-3 text-xs text-text-tertiary'>
            <div className='mb-1 font-medium uppercase tracking-wide text-text-tertiary'>
              {t('challenges.player.lastAttempt', 'Last attempt')}
            </div>
            <div className='text-text-secondary'>
              {new Date(mostRecentAttempt.timestamp).toLocaleTimeString()} · {mostRecentAttempt.success
                ? t('challenges.player.status.success')
                : t('challenges.player.status.failed')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
