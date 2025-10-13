'use client'

import { RiLoader4Line } from '@remixicon/react'
import type { LiveOutputState, Translate } from './types'

type LiveOutputCardProps = {
  liveOutput: LiveOutputState
  t: Translate
}

export default function LiveOutputCard({ liveOutput, t }: LiveOutputCardProps) {
  const { streamingThinking, streamingText, hasStreamingResult } = liveOutput
  const hasContent = hasStreamingResult || Boolean(streamingThinking) || Boolean(streamingText)

  if (!hasContent)
    return null

  return (
    <div className='bg-components-panel-bg/60 mt-4 rounded-lg border border-divider-subtle p-4'>
      <div className='flex items-center gap-2 text-sm font-medium text-text-secondary'>
        {t('challenges.player.liveOutput')}
        {hasStreamingResult && (
          <RiLoader4Line className='h-4 w-4 animate-spin text-text-tertiary' />
        )}
      </div>
      {streamingThinking && (
        <div className='mt-3 space-y-2 rounded-md border border-divider-subtle bg-components-panel-bg p-3'>
          <div className='text-xs font-medium uppercase tracking-wide text-text-tertiary'>
            {t('challenges.player.modelThinking', 'Thinking')}
          </div>
          <div className='whitespace-pre-wrap text-sm text-text-secondary'>{streamingThinking}</div>
        </div>
      )}
      {streamingText && (
        <div className='mt-3 whitespace-pre-wrap text-sm text-text-primary'>
          {streamingText}
        </div>
      )}
      {!streamingThinking && !streamingText && (
        <div className='mt-3 text-sm text-text-secondary'>
          {t('challenges.player.awaitingResponse')}
        </div>
      )}
    </div>
  )
}
