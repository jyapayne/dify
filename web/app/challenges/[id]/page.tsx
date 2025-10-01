'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { RiCheckLine, RiCloseLine, RiLoader4Line } from '@remixicon/react'
import { fetchChallengeDetail, fetchChallengeLeaderboard, submitChallengeAttempt } from '@/service/challenges'
import Leaderboard from '@/app/components/challenge/leaderboard'
import Button from '@/app/components/base/button'
import Textarea from '@/app/components/base/textarea'
import Toast from '@/app/components/base/toast'

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

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      Toast.notify({ type: 'error', message: 'Please enter a response' })
      return
    }

    if (!challenge?.app_id) {
      Toast.notify({ type: 'error', message: 'Challenge is not configured with an app' })
      return
    }

    setSubmitting(true)
    setLastResult(null)
    try {
      // Execute the workflow with the user's input
      // Endpoint varies by app type (chat vs workflow)
      const result = await submitChallengeAttempt(
        id,
        challenge.app_id,
        challenge.app_site_code,
        challenge.app_mode || 'workflow',
        userInput,
      )

      // Extract challenge results from workflow output
      // Response structure differs by app mode:
      // - Chat apps: result.data.answer + result.data.metadata.outputs
      // - Workflow apps: result.data (direct outputs)
      const isChatApp = challenge.app_mode === 'chat' || challenge.app_mode === 'advanced-chat'
      const workflowOutputs = isChatApp
        ? (result.data?.metadata?.outputs || {})
        : (result.data || {})

      const success = workflowOutputs.challenge_succeeded || false
      const rating = workflowOutputs.judge_rating
      const feedback = workflowOutputs.judge_feedback || workflowOutputs.message || result.data?.answer

      setLastResult({
        success,
        message: feedback || (success ? 'Challenge passed!' : 'Challenge not passed.'),
        rating,
      })

      if (success) {
        Toast.notify({ type: 'success', message: 'Challenge completed!' })
        // Refresh leaderboard
        const leaders = await fetchChallengeLeaderboard(id)
        setLeaderboard(leaders)
      }
    }
    catch (e: any) {
      console.error('Submission error:', e)
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
    <div className='min-h-screen bg-components-panel-bg'>
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
                disabled={!userInput.trim()}
                className='w-full'
              >
                {submitting ? (
                  <>
                    <RiLoader4Line className='mr-2 h-4 w-4 animate-spin' />
                    {t('common.operation.processing')}
                  </>
                ) : (
                  t('challenges.player.submit')
                )}
              </Button>

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
                        <div className='text-sm text-text-secondary'>{lastResult.message}</div>
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
