import type { NodeDefault } from '../../types'
import { genNodeMetaData } from '@/app/components/workflow/utils'
import { BlockEnum, VarType } from '@/app/components/workflow/types'
import { BlockClassificationEnum } from '@/app/components/workflow/block-selector/types'
import type { TeamChallengeNodeType } from './types'

const metaData = genNodeMetaData({
  classification: BlockClassificationEnum.Utilities,
  sort: 5,
  type: BlockEnum.TeamChallenge,
  helpLinkUri: 'team-challenge',
})

const nodeDefault: NodeDefault<TeamChallengeNodeType> = {
  metaData,
  defaultValue: {
    defense_selection_policy: 'latest_best',
    attack_selection_policy: 'latest_best',
    scoring_strategy: 'red_blue_ratio',
    inputs: {
      team_choice: [],
      attack_prompt: [],
      defense_prompt: [],
    },
  },
  getOutputVars() {
    return [
      { variable: 'team', type: VarType.string },
      { variable: 'judge_passed', type: VarType.boolean },
      { variable: 'judge_rating', type: VarType.number },
      { variable: 'judge_feedback', type: VarType.string },
      { variable: 'categories', type: VarType.object },
      { variable: 'team_points', type: VarType.number },
      { variable: 'total_points', type: VarType.number },
    ]
  },
  checkValid(_payload: TeamChallengeNodeType) {
    return { isValid: true }
  },
}

export default nodeDefault
