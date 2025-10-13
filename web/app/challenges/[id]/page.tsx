'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import Toast from '@/app/components/base/toast'
import { fetchChallengeDetail, fetchChallengeLeaderboard, submitChallengeAttempt } from '@/service/challenges'
import ChallengeNotFoundState from './components/challenge-not-found'
import ChallengeHeader from './components/challenge-header'
import GoalCard from './components/goal-card'
import AttemptComposer from './components/attempt-composer'
import SessionSummaryCard from './components/session-summary-card'
import LeaderboardSection from './components/leaderboard-section'
import LoadingState from './components/loading-state'
import type { AttemptResult, ChallengeDetail, LeaderboardEntry, LiveOutputState } from './components/types'

export default function ChallengeDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const id = params?.id as string

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userInput, setUserInput] = useState('')

  const [streamingText, setStreamingText] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [attempts, setAttempts] = useState<AttemptResult[]>([])
  const [hasStreamingResult, setHasStreamingResult] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const successCount = attempts.filter(attempt => attempt.success).length
  const failureCount = attempts.length - successCount
  const mostRecentAttempt = attempts[0]

  useEffect(() => {
    const load = async () => {
      try {
        const [detail, leaders] = await Promise.all([
          fetchChallengeDetail(id),
          fetchChallengeLeaderboard(id),
        ])
        setChallenge(detail as ChallengeDetail)
        setLeaderboard((leaders ?? []) as LeaderboardEntry[])
      }
      catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load challenge'
        Toast.notify({ type: 'error', message })
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

  const parseModelOutput = useCallback((text: string) => {
    if (!text)
      return { thinking: '', response: '' }

    const thinkStart = text.toLowerCase().indexOf('<think>')
    if (thinkStart === -1)
      return { thinking: '', response: text.trim() }

    const beforeThink = text.slice(0, thinkStart)
    const afterThinkStart = text.slice(thinkStart + 7)
    const thinkEndRelative = afterThinkStart.toLowerCase().indexOf('</think>')

    if (thinkEndRelative === -1) {
      const thinking = afterThinkStart.trim()
      const response = beforeThink.trim()
      return { thinking, response }
    }

    const thinking = afterThinkStart.slice(0, thinkEndRelative).trim()
    const afterThink = afterThinkStart.slice(thinkEndRelative + 8)
    const response = `${beforeThink}${afterThink}`.trim()
    return { thinking, response }
  }, [])

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
    setStreamingText('')
    setStreamingThinking('')
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
            const { thinking, response } = parseModelOutput(text)
            setStreamingThinking(thinking)
            setStreamingText(response)
            setHasStreamingResult(true)
          },
          onAbortController: (controller) => {
            abortControllerRef.current = controller
          },
          onError: (message) => {
            setHasStreamingResult(false)
            setStreamingText('')
            setStreamingThinking('')
            Toast.notify({ type: 'error', message })
          },
        },
      )

      setHasStreamingResult(false)
      const { thinking: finalThinking, response: finalResponse } = parseModelOutput(result.rawText)
      setStreamingThinking(finalThinking)
      setStreamingText(finalResponse)

      const judgeFeedback = typeof result.outputs?.judge_feedback === 'string' && result.outputs.judge_feedback.trim().length > 0
        ? result.outputs.judge_feedback
        : undefined
      const fallbackExplanation = typeof result.outputs?.message === 'string' && result.outputs.message.trim().length > 0
        ? result.outputs.message
        : ''
      const successFallback = t('challenges.player.defaultSuccessMessage', 'Challenge passed!')
      const failureFallback = t('challenges.player.defaultFailureMessage', 'Challenge not passed.')
      const judgeFeedbackLine = judgeFeedback
        ? t('challenges.player.judgeFeedbackLine', { feedback: judgeFeedback, defaultValue: `${judgeFeedback}` })
        : ''
      const { thinking, response } = parseModelOutput(judgeFeedback || fallbackExplanation)
      const combinedMessage = result.success
        ? [response || successFallback].filter(Boolean).join('\n')
        : [judgeFeedbackLine || response || failureFallback].filter(Boolean).join('\n')

      setAttempts(prev => ([
        {
          success: result.success,
          message: combinedMessage,
          rating: result.rating,
          thinking,
          timestamp: Date.now(),
        },
        ...prev,
      ]))

      if (result.success) {
        Toast.notify({ type: 'success', message: 'Challenge completed!' })
        const leaders = await fetchChallengeLeaderboard(id)
        setLeaderboard((leaders ?? []) as LeaderboardEntry[])
      }
    }
    catch (error: unknown) {
      console.error('Submission error:', error)
      setHasStreamingResult(false)
      setStreamingText('')
      setStreamingThinking('')
      if (error instanceof Error) {
        if (error.name === 'AbortError')
          return
        if (!(error as any).__handled)
          Toast.notify({ type: 'error', message: error.message || 'Submission failed' })
      }
      else {
        Toast.notify({ type: 'error', message: 'Submission failed' })
      }
    }
    finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return <LoadingState message={t('common.loading')} />

  if (!challenge)
    return <ChallengeNotFoundState message={t('challenges.player.notFound', 'Challenge not found')} />

  const liveOutputState: LiveOutputState = {
    streamingText,
    streamingThinking,
    hasStreamingResult,
  }

  return (
    <div className='min-h-screen overflow-y-auto bg-components-panel-bg'>
      <div className='mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8'>
        <ChallengeHeader challenge={challenge} />

        <div className='grid gap-6 lg:grid-cols-3'>
          <div className='lg:col-span-2'>
            {challenge.goal && <GoalCard goal={challenge.goal} t={t} />}
            <AttemptComposer
              userInput={userInput}
              onUserInputChange={value => setUserInput(value)}
              onSubmit={handleSubmit}
              submitting={submitting}
              t={t}
              liveOutput={liveOutputState}
              attempts={attempts}
            />
          </div>

          <div className='lg:col-span-1'>
            <div className='space-y-6'>
              <SessionSummaryCard
                t={t}
                attemptsTotal={attempts.length}
                successCount={successCount}
                failureCount={failureCount}
                mostRecentAttempt={mostRecentAttempt}
              />
              <LeaderboardSection
                leaderboard={leaderboard}
                scoringStrategy={challenge.scoring_strategy}
                emptyHint={t('challenges.player.leaderboardEmptyHint')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
