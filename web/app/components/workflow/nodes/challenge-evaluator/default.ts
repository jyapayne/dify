import type { NodeDefault } from '../../types'
import { genNodeMetaData } from '@/app/components/workflow/utils'
import { BlockEnum, VarType } from '@/app/components/workflow/types'
import { BlockClassificationEnum } from '@/app/components/workflow/block-selector/types'
import type { ChallengeEvaluatorNodeType } from './types'

const metaData = genNodeMetaData({
  classification: BlockClassificationEnum.Utilities,
  sort: 3,
  type: BlockEnum.ChallengeEvaluator,
  helpLinkUri: 'challenge-evaluator',
})

const nodeDefault: NodeDefault<ChallengeEvaluatorNodeType> = {
  metaData,
  defaultValue: {
    evaluation_mode: 'rules',
    success_type: 'contains',
    success_pattern: '',
    scoring_strategy: 'highest_rating',
    mask_variables: [],
    inputs: {
      response: [],
    },
  },
  getOutputVars() {
    return [
      { variable: 'challenge_succeeded', type: VarType.boolean },
      { variable: 'judge_rating', type: VarType.number },
      { variable: 'judge_feedback', type: VarType.string },
      { variable: 'message', type: VarType.string },
    ]
  },
  checkValid(payload: ChallengeEvaluatorNodeType, t: any) {
    let errorMessages = ''
    if (payload.evaluation_mode === 'rules' && !payload.success_pattern)
      errorMessages = t('workflow.errorMsg.fieldRequired', { field: 'success_pattern' })
    return { isValid: !errorMessages, errorMessage: errorMessages }
  },
}

export default nodeDefault
