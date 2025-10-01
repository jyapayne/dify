import type { CommonNodeType, ValueSelector } from '@/app/components/workflow/types'
import { BlockEnum } from '@/app/components/workflow/types'

export type ChallengeEvaluatorNodeType = CommonNodeType<{
  challenge_id?: string
  evaluation_mode?: 'rules' | 'llm-judge' | 'custom'
  success_type?: 'regex' | 'contains' | 'custom'
  success_pattern?: string
  scoring_strategy?: 'first' | 'fastest' | 'fewest_tokens' | 'highest_rating' | 'custom'
  mask_variables?: string[]
  inputs?: {
    response?: ValueSelector
  }
}>

export const DEFAULT_CHALLENGE_EVALUATOR_INPUTS: ChallengeEvaluatorNodeType['inputs'] = {
  response: [],
}

export const CHALLENGE_EVALUATOR_BLOCK_TYPE = BlockEnum.ChallengeEvaluator
