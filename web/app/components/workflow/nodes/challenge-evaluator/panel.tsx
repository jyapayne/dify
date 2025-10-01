import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { NodePanelProps } from '@/app/components/workflow/types'
import Field from '@/app/components/workflow/nodes/_base/components/field'
import Split from '@/app/components/workflow/nodes/_base/components/split'
import OutputVars, { VarItem } from '@/app/components/workflow/nodes/_base/components/output-vars'
import VarReferencePicker from '@/app/components/workflow/nodes/_base/components/variable/var-reference-picker'
import type { ChallengeEvaluatorNodeType } from './types'
import useNodeCrud from '@/app/components/workflow/nodes/_base/hooks/use-node-crud'
import produce from 'immer'
import useSWR from 'swr'
import { fetchChallenges } from '@/service/challenges'
import Editor from '@/app/components/workflow/nodes/_base/components/prompt/editor'
import useAvailableVarList from '@/app/components/workflow/nodes/_base/hooks/use-available-var-list'
import Select from '@/app/components/base/select'

const i18nPrefix = 'workflow.nodes.challengeEvaluator'

const Panel: FC<NodePanelProps<ChallengeEvaluatorNodeType>> = ({ id, data }) => {
  const { t } = useTranslation()
  const { inputs, setInputs } = useNodeCrud<ChallengeEvaluatorNodeType>(id, data)
  const { data: challenges } = useSWR('challenges:list', fetchChallenges)

  const filterVar = useMemo(() => (_: any) => true, [])
  const { availableVars, availableNodesWithParent } = useAvailableVarList(id, { onlyLeafNodeVar: false, filterVar })

  return (
    <div className='pt-2'>
      <div className='space-y-4 px-4 pb-4'>
        <Field title={t(`${i18nPrefix}.selectedChallenge`)} tooltip={t(`${i18nPrefix}.selectedChallengeTip`)}>
          <Select
            items={(challenges || []).map((c: any) => ({ value: c.id, name: c.name }))}
            defaultValue={data.challenge_id || ''}
            onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).challenge_id = (item?.value as string) || undefined }))}
            allowSearch={false}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.evaluationMode`)} tooltip={t(`${i18nPrefix}.evaluationModeTip`)}>
          <Select
            items={[
              { value: 'rules', name: 'Rules' },
              { value: 'llm-judge', name: 'Judging LLM' },
              { value: 'custom', name: 'Custom' },
            ]}
            defaultValue={data.evaluation_mode || 'rules'}
            onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).evaluation_mode = item.value as string }))}
            allowSearch={false}
          />
        </Field>
        {!data.challenge_id && data.evaluation_mode === 'rules' && (
          <>
            <Field title={t(`${i18nPrefix}.successType`)} tooltip={t(`${i18nPrefix}.successTypeTip`)}>
              <Select
                items={[
                  { value: 'contains', name: 'Contains' },
                  { value: 'regex', name: 'Regex' },
                ]}
                defaultValue={data.success_type || 'contains'}
                onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).success_type = item.value as string }))}
                allowSearch={false}
              />
            </Field>
            <Field title={t(`${i18nPrefix}.successPattern`)} tooltip={t(`${i18nPrefix}.successPatternTip`)} required>
              <Editor
                title={<div className='text-xs font-semibold uppercase text-text-secondary'>pattern</div>}
                value={data.success_pattern || ''}
                onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).success_pattern = v }))}
                readOnly={false}
                isShowContext={false}
                isChatApp
                isChatModel
                hasSetBlockStatus={{ history: false, query: false, context: false }}
                nodesOutputVars={availableVars}
                availableNodes={availableNodesWithParent}
                isSupportFileVar
              />
            </Field>
          </>
        )}
        <Field title={t(`${i18nPrefix}.responseVar`)} tooltip={t(`${i18nPrefix}.responseVarTip`)}>
          <VarReferencePicker
            nodeId={id}
            readonly={false}
            isShowNodeName
            value={data.inputs?.response || []}
            onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).inputs = { ...(draft as any).inputs, response: v } }))}
            filterVar={filterVar}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.scoringStrategy`)} tooltip={t(`${i18nPrefix}.scoringStrategyTip`)}>
          <Select
            items={[
              { value: 'first', name: t(`${i18nPrefix}.scoringFirst`) },
              { value: 'fastest', name: t(`${i18nPrefix}.scoringFastest`) },
              { value: 'fewest_tokens', name: t(`${i18nPrefix}.scoringFewestTokens`) },
              { value: 'highest_rating', name: t(`${i18nPrefix}.scoringHighestRating`) },
              { value: 'custom', name: t(`${i18nPrefix}.scoringCustom`) },
            ]}
            defaultValue={data.scoring_strategy || 'highest_rating'}
            onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).scoring_strategy = item.value as string }))}
            allowSearch={false}
          />
        </Field>
      </div>
      <Split />
      <div>
        <OutputVars>
          <>
            <VarItem name='challenge_succeeded' type='boolean' description='Challenge succeeded' />
            <VarItem name='judge_rating' type='number' description='Judge rating' />
            <VarItem name='judge_feedback' type='string' description='Judge feedback' />
            <VarItem name='message' type='string' description='Message' />
          </>
        </OutputVars>
      </div>
    </div>
  )
}

export default memo(Panel)
