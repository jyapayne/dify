'use client'

import { RiCheckLine, RiCloseLine } from '@remixicon/react'
import type { AttemptResult, Translate } from './types'

type AttemptHistoryItemProps = {
  attempt: AttemptResult
  t: Translate
}

export default function AttemptHistoryItem({ attempt, t }: AttemptHistoryItemProps) {
  return (
    <div className={`rounded-lg border p-4 ${attempt.success ? 'border-util-colors-green-green-500 bg-util-colors-green-green-50' : 'border-util-colors-orange-orange-500 bg-util-colors-orange-orange-50'}`}>
      <div className='flex items-start gap-3'>
        {attempt.success ? (
          <RiCheckLine className='h-5 w-5 shrink-0 text-util-colors-green-green-600' />
        ) : (
          <RiCloseLine className='h-5 w-5 shrink-0 text-util-colors-orange-orange-600' />
        )}
        <div className='flex-1'>
          <div className='flex items-center justify-between'>
            <div className={`mb-1 font-medium ${attempt.success ? 'text-util-colors-green-green-700' : 'text-util-colors-orange-orange-700'}`}>
              {attempt.success ? t('challenges.player.status.success') : t('challenges.player.status.failed')}
            </div>
            <div className='text-xs text-text-tertiary'>
              {new Date(attempt.timestamp).toLocaleTimeString()}
            </div>
          </div>
          {attempt.thinking && (
            <div className='bg-components-panel-bg/60 mt-3 space-y-2 rounded-md border border-divider-subtle p-3'>
              <div className='text-xs font-medium uppercase tracking-wide text-text-tertiary'>
                {t('challenges.player.modelThinking', 'Thinking')}
              </div>
              <div className='whitespace-pre-wrap text-sm text-text-secondary'>{attempt.thinking}</div>
            </div>
          )}
          {attempt.message && (
            <div className='mt-3 whitespace-pre-wrap text-sm text-text-secondary'>{attempt.message}</div>
          )}
          {attempt.rating !== undefined && (
            <div className='mt-2 text-sm text-text-tertiary'>
              {t('challenges.leaderboard.rating')}: {attempt.rating}/10
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
