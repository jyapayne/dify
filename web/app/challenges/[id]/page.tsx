'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { RiCheckLine, RiCloseLine, RiLoader4Line } from '@remixicon/react'
import Leaderboard from '@/app/components/challenge/leaderboard'
import Button from '@/app/components/base/button'
import Textarea from '@/app/components/base/textarea'
import Toast from '@/app/components/base/toast'
import { fetchChallengeDetail, fetchChallengeLeaderboard, submitChallengeAttempt } from '@/service/challenges'

export default function ChallengeDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const id = params?.id as string

  const [challenge, setChallenge] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [lastResult, setLastResult] = useState<{ success: boolean; message?: string; rating?: number } | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [hasStreamingResult, setHasStreamingResult] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [detail, leaders] = await Promise.all([
          fetchChallengeDetail(id),
          fetchChallengeLeaderboard(id),
        ])
        setChallenge(detail)
        setLeaderboard(leaders)
      }
      catch (e: any) {
        Toast.notify({ type: 'error', message: e.message || 'Failed to load challenge' })
      }
      finally {
        setLoading(false)
      }
    }
    if (id)
      load()
  }, [id])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setHasStreamingResult(false)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflowY
    document.body.style.overflowY = 'auto'
    return () => {
      document.body.style.overflowY = previousOverflow
    }
  }, [])

  useEffect(() => () => {
    stopStreaming()
  }, [stopStreaming])

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      Toast.notify({ type: 'error', message: 'Please enter a response' })
      return
    }

    if (!challenge?.app_id) {
      Toast.notify({ type: 'error', message: 'Challenge is not configured with an app' })
      return
    }
    stopStreaming()
    setSubmitting(true)
    setLastResult(null)
    setStreamingText('')
    setHasStreamingResult(false)
    try {
      const result = await submitChallengeAttempt(
        id,
        challenge.app_id,
        challenge.app_site_code,
        challenge.app_mode || 'workflow',
        userInput,
        challenge.goal,
        {
          onStreamUpdate: (text) => {
            setStreamingText(text)
            setHasStreamingResult(true)
          },
          onAbortController: (controller) => {
            abortControllerRef.current = controller
          },
          onError: (message) => {
            setHasStreamingResult(false)
            setStreamingText('')
            Toast.notify({ type: 'error', message })
          },
        },
      )

      setHasStreamingResult(false)
      setStreamingText(result.rawText)

      const judgeFeedback = typeof result.outputs?.judge_feedback === 'string' && result.outputs.judge_feedback.trim().length > 0
        ? result.outputs.judge_feedback
        : (typeof result.message === 'string' && result.message.trim().length > 0 ? result.message : undefined)
      const fallbackExplanation = typeof result.outputs?.message === 'string' && result.outputs.message.trim().length > 0
        ? result.outputs.message
        : ''
      const successFallback = t('challenges.player.defaultSuccessMessage', 'Challenge passed!')
      const failureFallback = t('challenges.player.defaultFailureMessage', 'Challenge not passed.')
      const judgeFeedbackLine = judgeFeedback
        ? t('challenges.player.judgeFeedbackLine', { feedback: judgeFeedback, defaultValue: `${judgeFeedback}` })
        : ''
      const combinedMessage = result.success
        ? [judgeFeedback || fallbackExplanation || successFallback].filter(Boolean).join('\n')
        : [judgeFeedbackLine || fallbackExplanation || failureFallback].filter(Boolean).join('\n')

      setLastResult({
        success: result.success,
        message: combinedMessage,
        rating: result.rating,
      })

      if (result.success) {
        Toast.notify({ type: 'success', message: 'Challenge completed!' })
        // Refresh leaderboard
        const leaders = await fetchChallengeLeaderboard(id)
        setLeaderboard(leaders)
      }
    }
    catch (e: any) {
      console.error('Submission error:', e)
      setHasStreamingResult(false)
      setStreamingText('')
      if (e?.name === 'AbortError')
        return
      if (!e?.__handled)
        Toast.notify({ type: 'error', message: e.message || 'Submission failed' })
    }
    finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-components-panel-bg'>
        <div className='text-text-tertiary'>{t('common.loading')}</div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-components-panel-bg'>
        <div className='text-text-secondary'>Challenge not found</div>
      </div>
    )
  }

  return (
    <div className='min-h-screen overflow-y-auto bg-components-panel-bg'>
      <div className='mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mb-8'>
          <h1 className='mb-2 text-3xl font-bold text-text-primary'>{challenge.name}</h1>
          {challenge.description && (
            <p className='text-lg text-text-secondary'>{challenge.description}</p>
          )}
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          <div className='lg:col-span-2'>
            {challenge.goal && (
              <div className='mb-6 rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
                <h2 className='mb-2 text-sm font-medium uppercase tracking-wide text-text-tertiary'>
                  {t('challenges.player.goal')}
                </h2>
                <p className='text-text-primary'>{challenge.goal}</p>
              </div>
            )}

            <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
              <h2 className='mb-4 text-lg font-semibold text-text-primary'>
                {t('challenges.player.yourAttempt')}
              </h2>

              <Textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder='Enter your response here...'
                rows={8}
                className='mb-4 w-full'
              />

              <Button
                type='primary'
                onClick={handleSubmit}
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

              {(hasStreamingResult || streamingText) && (
                <div className='bg-components-panel-bg/60 mt-4 rounded-lg border border-divider-subtle p-4'>
                  <div className='flex items-center gap-2 text-sm font-medium text-text-secondary'>
                    {t('challenges.player.liveOutput')}
                    {hasStreamingResult && (
                      <RiLoader4Line className='h-4 w-4 animate-spin text-text-tertiary' />
                    )}
                  </div>
                  <div className='mt-2 whitespace-pre-wrap text-sm text-text-primary'>
                    {streamingText || t('challenges.player.awaitingResponse')}
                  </div>
                </div>
              )}

              {lastResult && (
                <div className={`mt-4 rounded-lg border p-4 ${lastResult.success ? 'border-util-colors-green-green-500 bg-util-colors-green-green-50' : 'border-util-colors-orange-orange-500 bg-util-colors-orange-orange-50'}`}>
                  <div className='flex items-start gap-3'>
                    {lastResult.success ? (
                      <RiCheckLine className='h-5 w-5 shrink-0 text-util-colors-green-green-600' />
                    ) : (
                      <RiCloseLine className='h-5 w-5 shrink-0 text-util-colors-orange-orange-600' />
                    )}
                    <div className='flex-1'>
                      <div className={`mb-1 font-medium ${lastResult.success ? 'text-util-colors-green-green-700' : 'text-util-colors-orange-orange-700'}`}>
                        {lastResult.success ? t('challenges.player.status.success') : t('challenges.player.status.failed')}
                      </div>
                      {lastResult.message && (
                        <div className='whitespace-pre-wrap text-sm text-text-secondary'>{lastResult.message}</div>
                      )}
                      {lastResult.rating !== undefined && (
                        <div className='mt-2 text-sm text-text-tertiary'>
                          {t('challenges.leaderboard.rating')}: {lastResult.rating}/10
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='lg:col-span-1'>
            <Leaderboard entries={leaderboard} strategy={challenge.scoring_strategy} />
          </div>
        </div>
      </div>
    </div>
  )
}
