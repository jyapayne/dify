import type { CommonNodeType, ModelConfig, ValueSelector } from '@/app/components/workflow/types'
import { BlockEnum } from '@/app/components/workflow/types'

export type JudgingLLMNodeType = CommonNodeType<{
  judge_model: ModelConfig
  rubric_prompt_template: string
  rating_scale?: number
  pass_threshold?: number
  inputs?: {
    goal?: ValueSelector
    response?: ValueSelector
  }
}>

export const DEFAULT_JUDGE_MODEL: ModelConfig = {
  provider: '',
  name: '',
  mode: 'chat',
  completion_params: {
    temperature: 0.3,
  },
}

export const JUDGING_LLM_BLOCK_TYPE = BlockEnum.JudgingLLM
