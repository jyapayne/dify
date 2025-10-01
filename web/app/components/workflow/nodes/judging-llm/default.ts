import type { NodeDefault } from '../../types'
import { genNodeMetaData } from '@/app/components/workflow/utils'
import { BlockEnum, VarType } from '@/app/components/workflow/types'
import { BlockClassificationEnum } from '@/app/components/workflow/block-selector/types'
import type { JudgingLLMNodeType } from './types'
import { DEFAULT_JUDGE_MODEL } from './types'

const metaData = genNodeMetaData({
  classification: BlockClassificationEnum.Utilities,
  sort: 4,
  type: BlockEnum.JudgingLLM,
  helpLinkUri: 'judging-llm',
})

const nodeDefault: NodeDefault<JudgingLLMNodeType> = {
  metaData,
  defaultValue: {
    judge_model: DEFAULT_JUDGE_MODEL,
    rubric_prompt_template: '',
    rating_scale: 10,
    pass_threshold: 7,
    inputs: {
      goal: [],
      response: [],
    },
  },
  getOutputVars() {
    return [
      { variable: 'judge_passed', type: VarType.boolean },
      { variable: 'judge_rating', type: VarType.number },
      { variable: 'judge_feedback', type: VarType.string },
      { variable: 'judge_raw', type: VarType.object },
    ]
  },
  checkValid(payload: JudgingLLMNodeType, t: any) {
    let errorMessages = ''
    if (!payload.judge_model?.provider)
      errorMessages = t('workflow.errorMsg.fieldRequired', { field: t('workflow.common.model') })
    if (!errorMessages && !payload.rubric_prompt_template)
      errorMessages = t('workflow.errorMsg.fieldRequired', { field: 'rubric_prompt_template' })
    return { isValid: !errorMessages, errorMessage: errorMessages }
  },
}

export default nodeDefault
