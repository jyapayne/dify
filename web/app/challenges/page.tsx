'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { RiArrowRightLine, RiAwardLine } from '@remixicon/react'
import { fetchChallenges } from '@/service/challenges'
import type { ChallengeListItem } from '@/service/challenges'

export default function ChallengesListPage() {
  const { t } = useTranslation()
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchChallenges()
        console.log('Loaded challenges:', data)
        setChallenges(data)
      }
      catch (error) {
        console.error('Failed to load challenges:', error)
      }
      finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className='min-h-screen bg-components-panel-bg'>
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mb-8 text-center'>
          <h1 className='mb-2 text-4xl font-bold text-text-primary'>{t('challenges.player.browse')}</h1>
          <p className='text-lg text-text-secondary'>Test your skills and compete on the leaderboard</p>
        </div>

        {loading ? (
          <div className='text-center text-text-tertiary'>{t('common.loading')}</div>
        ) : challenges.length === 0 ? (
          <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-12 text-center'>
            <RiAwardLine className='mx-auto mb-4 h-12 w-12 text-text-quaternary' />
            <div className='text-text-secondary'>No challenges available yet</div>
          </div>
        ) : (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {challenges.map(challenge => (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className='group block'
              >
                <div className='h-full rounded-xl border border-divider-subtle bg-components-panel-bg p-6 shadow-xs transition-all hover:border-components-button-primary-bg hover:shadow-md'>
                  <div className='mb-3 flex items-start justify-between'>
                    <RiAwardLine className='h-8 w-8 text-util-colors-cyan-cyan-500' />
                    <RiArrowRightLine className='h-5 w-5 text-text-quaternary transition-transform group-hover:translate-x-1' />
                  </div>
                  <h3 className='mb-2 text-lg font-semibold text-text-primary'>{challenge.name}</h3>
                  {challenge.description && (
                    <p className='mb-3 line-clamp-2 text-sm text-text-secondary'>{challenge.description}</p>
                  )}
                  {challenge.goal && (
                    <div className='mt-4 rounded-lg bg-components-panel-on-panel-item-bg p-3'>
                      <div className='mb-1 text-xs font-medium uppercase text-text-tertiary'>Goal</div>
                      <div className='line-clamp-2 text-sm text-text-secondary'>{challenge.goal}</div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
