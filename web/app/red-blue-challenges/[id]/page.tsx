'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { RiLoader4Line, RiShieldLine, RiSwordLine } from '@remixicon/react'
import { fetchRedBlueLeaderboard, submitRedBluePrompt } from '@/service/redBlueChallenges'
import Button from '@/app/components/base/button'
import Textarea from '@/app/components/base/textarea'
import Toast from '@/app/components/base/toast'

export default function RedBlueChallengeDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const id = params?.id as string

  const [team, setTeam] = useState<'red' | 'blue' | null>(null)
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const leaders = await fetchRedBlueLeaderboard(id)
        setLeaderboard(leaders)
      }
      catch (e: any) {
        console.error('Failed to load leaderboard:', e)
      }
    }
    if (id)
      load()
  }, [id])

  const handleSubmit = async () => {
    if (!team || !prompt.trim()) {
      Toast.notify({ type: 'error', message: 'Please choose a team and enter a prompt' })
      return
    }

    setSubmitting(true)
    setLastResult(null)
    try {
      const result = await submitRedBluePrompt(id, team, prompt)
      setLastResult(result)
      Toast.notify({ type: 'success', message: 'Prompt submitted!' })
      setPrompt('')

      // Refresh leaderboard
      const leaders = await fetchRedBlueLeaderboard(id)
      setLeaderboard(leaders)
    }
    catch (e: any) {
      Toast.notify({ type: 'error', message: e.message || 'Submission failed' })
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-components-panel-bg'>
      <div className='mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mb-8 text-center'>
          <h1 className='mb-2 text-3xl font-bold text-text-primary'>{t('challenges.redBlue.title')}</h1>
          <p className='text-lg text-text-secondary'>Join the Red or Blue team and compete</p>
        </div>

        {!team ? (
          <div className='grid gap-6 sm:grid-cols-2'>
            <button
              onClick={() => setTeam('red')}
              className='group rounded-xl border-2 border-util-colors-red-red-300 bg-util-colors-red-red-50 p-8 shadow-xs transition-all hover:border-util-colors-red-red-500 hover:shadow-md'
            >
              <RiSwordLine className='mx-auto mb-4 h-16 w-16 text-util-colors-red-red-600' />
              <h2 className='mb-2 text-2xl font-bold text-util-colors-red-red-700'>
                {t('challenges.redBlue.red')}
              </h2>
              <p className='text-util-colors-red-red-600'>{t('challenges.redBlue.redDesc')}</p>
            </button>

            <button
              onClick={() => setTeam('blue')}
              className='group rounded-xl border-2 border-util-colors-blue-blue-300 bg-util-colors-blue-blue-50 p-8 shadow-xs transition-all hover:border-util-colors-blue-blue-500 hover:shadow-md'
            >
              <RiShieldLine className='mx-auto mb-4 h-16 w-16 text-util-colors-blue-blue-600' />
              <h2 className='mb-2 text-2xl font-bold text-util-colors-blue-blue-700'>
                {t('challenges.redBlue.blue')}
              </h2>
              <p className='text-util-colors-blue-blue-600'>{t('challenges.redBlue.blueDesc')}</p>
            </button>
          </div>
        ) : (
          <div className='grid gap-6 lg:grid-cols-3'>
            <div className='lg:col-span-2'>
              <div className={`rounded-xl border-2 p-6 shadow-xs ${team === 'red' ? 'border-util-colors-red-red-300 bg-util-colors-red-red-50' : 'border-util-colors-blue-blue-300 bg-util-colors-blue-blue-50'}`}>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className={`text-xl font-bold ${team === 'red' ? 'text-util-colors-red-red-700' : 'text-util-colors-blue-blue-700'}`}>
                    {team === 'red' ? t('challenges.redBlue.submitAttack') : t('challenges.redBlue.submitDefense')}
                  </h2>
                  <Button
                    size='small'
                    onClick={() => {
                      setTeam(null)
                      setPrompt('')
                      setLastResult(null)
                    }}
                  >
                    Switch Team
                  </Button>
                </div>

                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={team === 'red' ? t('challenges.redBlue.attackPrompt') : t('challenges.redBlue.defensePrompt')}
                  rows={8}
                  className='mb-4 w-full'
                />

                <Button
                  type='primary'
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!prompt.trim()}
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
                  <div className='mt-4 rounded-lg border border-divider-subtle bg-components-panel-bg p-4'>
                    <h3 className='mb-2 font-medium text-text-primary'>{t('challenges.redBlue.results')}</h3>
                    {lastResult.judge_rating !== undefined && (
                      <div className='text-sm text-text-secondary'>
                        {t('challenges.leaderboard.rating')}: {lastResult.judge_rating}/10
                      </div>
                    )}
                    {lastResult.team_points !== undefined && (
                      <div className='mt-1 text-sm text-text-secondary'>
                        Points earned: {lastResult.team_points}
                      </div>
                    )}
                    {lastResult.judge_feedback && (
                      <div className='mt-2 text-sm text-text-tertiary'>{lastResult.judge_feedback}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className='lg:col-span-1'>
              {leaderboard && (
                <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs'>
                  <h3 className='mb-4 text-lg font-semibold text-text-primary'>Standings</h3>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between rounded-lg bg-util-colors-red-red-50 p-3'>
                      <span className='font-medium text-util-colors-red-red-700'>
                        {t('challenges.redBlue.redPoints')}
                      </span>
                      <span className='text-xl font-bold text-util-colors-red-red-700'>
                        {leaderboard.red_points || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between rounded-lg bg-util-colors-blue-blue-50 p-3'>
                      <span className='font-medium text-util-colors-blue-blue-700'>
                        {t('challenges.redBlue.bluePoints')}
                      </span>
                      <span className='text-xl font-bold text-util-colors-blue-blue-700'>
                        {leaderboard.blue_points || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
