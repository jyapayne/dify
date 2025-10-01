import type { CommonNodeType, ValueSelector } from '@/app/components/workflow/types'
import { BlockEnum } from '@/app/components/workflow/types'

export type TeamChallengeNodeType = CommonNodeType<{
  red_blue_challenge_id?: string
  defense_selection_policy?: 'latest_best' | 'random_active' | 'round_robin' | 'request_new_if_none'
  attack_selection_policy?: 'latest_best' | 'random_active' | 'round_robin' | 'request_new_if_none'
  scoring_strategy?: 'red_blue_ratio' | 'custom'
  inputs?: {
    team_choice?: ValueSelector
    attack_prompt?: ValueSelector
    defense_prompt?: ValueSelector
  }
}>

export const TEAM_CHALLENGE_BLOCK_TYPE = BlockEnum.TeamChallenge
