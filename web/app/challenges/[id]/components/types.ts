import type { ComponentProps } from 'react'
import type { useTranslation } from 'react-i18next'
import type Leaderboard from '@/app/components/challenge/leaderboard'

export type Translate = ReturnType<typeof useTranslation>['t']

export type LeaderboardEntry = ComponentProps<typeof Leaderboard>['entries'][number]

export type ChallengeDetail = {
  id: string
  name: string
  description?: string
  goal?: string
  app_id?: string
  app_site_code?: string
  app_mode?: string
  scoring_strategy?: string
}

export type AttemptResult = {
  success: boolean
  message?: string
  rating?: number
  thinking?: string
  timestamp: number
}

export type LiveOutputState = {
  streamingText: string
  streamingThinking: string
  hasStreamingResult: boolean
}
