'use client'
import { useTranslation } from 'react-i18next'

type LeaderboardEntry = {
  rank: number
  player_name: string
  score: number
  elapsed_ms?: number
  tokens_total?: number
  judge_rating?: number
  created_at: string
  is_current_user?: boolean
}

type Props = {
  entries: LeaderboardEntry[]
  strategy?: string
}

export default function Leaderboard({ entries, strategy = 'highest_rating' }: Props) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return (
      <div className='rounded-xl border border-divider-subtle bg-components-panel-bg p-8 text-center'>
        <div className='text-text-tertiary'>{t('challenges.leaderboard.empty')}</div>
      </div>
    )
  }

  return (
    <div className='rounded-xl border border-divider-subtle bg-components-panel-bg shadow-xs'>
      <div className='border-b border-divider-subtle px-6 py-4'>
        <h2 className='text-lg font-semibold text-text-primary'>{t('challenges.leaderboard.title')}</h2>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='border-b border-divider-subtle bg-components-panel-on-panel-item-bg'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary'>
                {t('challenges.leaderboard.rank')}
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary'>
                {t('challenges.leaderboard.player')}
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary'>
                {t('challenges.leaderboard.score')}
              </th>
              {strategy === 'fastest' && (
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary'>
                  {t('challenges.leaderboard.time')}
                </th>
              )}
              {strategy === 'fewest_tokens' && (
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary'>
                  {t('challenges.leaderboard.tokens')}
                </th>
              )}
              {strategy === 'highest_rating' && (
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary'>
                  {t('challenges.leaderboard.rating')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className='divide-y divide-divider-subtle'>
            {entries.map((entry, idx) => (
              <tr
                key={idx}
                className={`transition-colors hover:bg-components-panel-on-panel-item-bg ${entry.is_current_user ? 'bg-util-colors-blue-blue-50' : ''}`}
              >
                <td className='whitespace-nowrap px-6 py-4'>
                  <div className='flex items-center'>
                    {entry.rank <= 3 ? (
                      <span className='text-lg'>
                        {entry.rank === 1 && '🥇'}
                        {entry.rank === 2 && '🥈'}
                        {entry.rank === 3 && '🥉'}
                      </span>
                    ) : (
                      <span className='text-sm text-text-tertiary'>#{entry.rank}</span>
                    )}
                  </div>
                </td>
                <td className='whitespace-nowrap px-6 py-4'>
                  <div className='flex items-center'>
                    <div className='text-sm font-medium text-text-primary'>
                      {entry.player_name}
                      {entry.is_current_user && (
                        <span className='ml-2 rounded bg-util-colors-blue-blue-100 px-1.5 py-0.5 text-xs text-util-colors-blue-blue-700'>
                          {t('challenges.leaderboard.yourBest')}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className='whitespace-nowrap px-6 py-4 text-sm text-text-secondary'>
                  {entry.score.toFixed(1)}
                </td>
                {strategy === 'fastest' && entry.elapsed_ms !== undefined && (
                  <td className='whitespace-nowrap px-6 py-4 text-sm text-text-secondary'>
                    {(entry.elapsed_ms / 1000).toFixed(2)}s
                  </td>
                )}
                {strategy === 'fewest_tokens' && entry.tokens_total !== undefined && (
                  <td className='whitespace-nowrap px-6 py-4 text-sm text-text-secondary'>
                    {entry.tokens_total}
                  </td>
                )}
                {strategy === 'highest_rating' && entry.judge_rating !== undefined && (
                  <td className='whitespace-nowrap px-6 py-4'>
                    <div className='flex items-center'>
                      <span className='text-sm font-medium text-text-primary'>{entry.judge_rating}/10</span>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
