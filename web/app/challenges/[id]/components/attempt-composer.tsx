'use client'

import Button from '@/app/components/base/button'
import Textarea from '@/app/components/base/textarea'
import { RiLoader4Line } from '@remixicon/react'
import type { AttemptResult, LiveOutputState, Translate } from './types'
import LiveOutputCard from './live-output-card'
import AttemptHistory from './attempt-history'

type AttemptComposerProps = {
  userInput: string
  onUserInputChange: (value: string) => void
  onSubmit: () => Promise<void> | void
  submitting: boolean
  t: Translate
  liveOutput: LiveOutputState
  attempts: AttemptResult[]
}

export default function AttemptComposer({
  userInput,
  onUserInputChange,
  onSubmit,
  submitting,
  t,
  liveOutput,
  attempts,
}: AttemptComposerProps) {
  return (
    <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
      <h2 className='mb-4 text-lg font-semibold text-text-primary'>
        {t('challenges.player.yourAttempt')}
      </h2>

      <Textarea
        value={userInput}
        onChange={event => onUserInputChange(event.target.value)}
        placeholder='Enter your response here...'
        rows={8}
        className='mb-4 w-full'
      />

      <Button
        type='primary'
        onClick={onSubmit}
        loading={submitting}
        disabled={submitting || !userInput.trim()}
        className='w-full'
      >
        {submitting ? (
          <>
            <RiLoader4Line className='mr-2 h-4 w-4 animate-spin' />
            {t('challenges.player.processing', 'Processing…')}
          </>
        ) : (
          t('challenges.player.submitButton', 'Submit')
        )}
      </Button>

      <LiveOutputCard liveOutput={liveOutput} t={t} />
      <AttemptHistory attempts={attempts} t={t} />
    </div>
  )
}
