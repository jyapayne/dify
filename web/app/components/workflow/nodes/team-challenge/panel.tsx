import type { FC } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { NodePanelProps } from '@/app/components/workflow/types'
import Field from '@/app/components/workflow/nodes/_base/components/field'
import Split from '@/app/components/workflow/nodes/_base/components/split'
import VarReferencePicker from '@/app/components/workflow/nodes/_base/components/variable/var-reference-picker'
import OutputVars, { VarItem } from '@/app/components/workflow/nodes/_base/components/output-vars'
import type { TeamChallengeNodeType } from './types'
import useNodeCrud from '@/app/components/workflow/nodes/_base/hooks/use-node-crud'
import produce from 'immer'
import useSWR from 'swr'
import { fetchRedBlueChallenges } from '@/service/redBlueChallenges'
import Select from '@/app/components/base/select'

const i18nPrefix = 'workflow.nodes.teamChallenge'

const Panel: FC<NodePanelProps<TeamChallengeNodeType>> = ({ id, data }) => {
  const { t } = useTranslation()
  const { inputs, setInputs } = useNodeCrud<TeamChallengeNodeType>(id, data)
  const { data: redBlue } = useSWR('redBlue:list', fetchRedBlueChallenges)

  return (
    <div className='pt-2'>
      <div className='space-y-4 px-4 pb-4'>
        <Field title={t(`${i18nPrefix}.selectedChallenge`)} tooltip={t(`${i18nPrefix}.selectedChallengeTip`)}>
          <Select
            items={(redBlue || []).map((c: any) => ({ value: c.id, name: c.name }))}
            defaultValue={data.red_blue_challenge_id || ''}
            onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).red_blue_challenge_id = (item?.value as string) || undefined }))}
            allowSearch={false}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.defenseSelectionPolicy`)} tooltip={t(`${i18nPrefix}.defenseSelectionPolicyTip`)}>
          <Select
            items={[
              { value: 'latest_best', name: 'latest_best' },
              { value: 'random_active', name: 'random_active' },
              { value: 'round_robin', name: 'round_robin' },
              { value: 'request_new_if_none', name: 'request_new_if_none' },
            ]}
            defaultValue={data.defense_selection_policy || 'latest_best'}
            onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).defense_selection_policy = item.value as string }))}
            allowSearch={false}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.attackSelectionPolicy`)} tooltip={t(`${i18nPrefix}.attackSelectionPolicyTip`)}>
          <Select
            items={[
              { value: 'latest_best', name: 'latest_best' },
              { value: 'random_active', name: 'random_active' },
              { value: 'round_robin', name: 'round_robin' },
              { value: 'request_new_if_none', name: 'request_new_if_none' },
            ]}
            defaultValue={data.attack_selection_policy || 'latest_best'}
            onSelect={item => setInputs(produce(inputs, (draft) => { (draft as any).attack_selection_policy = item.value as string }))}
            allowSearch={false}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.teamChoiceVar`)} tooltip={t(`${i18nPrefix}.teamChoiceVarTip`)}>
          <VarReferencePicker
            nodeId={id}
            isShowNodeName
            readonly={false}
            value={data.inputs?.team_choice || []}
            onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).inputs = { ...(draft as any).inputs, team_choice: v } }))}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.attackPromptVar`)} tooltip={t(`${i18nPrefix}.attackPromptVarTip`)}>
          <VarReferencePicker
            nodeId={id}
            isShowNodeName
            readonly={false}
            value={data.inputs?.attack_prompt || []}
            onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).inputs = { ...(draft as any).inputs, attack_prompt: v } }))}
          />
        </Field>
        <Field title={t(`${i18nPrefix}.defensePromptVar`)} tooltip={t(`${i18nPrefix}.defensePromptVarTip`)}>
          <VarReferencePicker
            nodeId={id}
            isShowNodeName
            readonly={false}
            value={data.inputs?.defense_prompt || []}
            onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).inputs = { ...(draft as any).inputs, defense_prompt: v } }))}
          />
        </Field>
      </div>
      <Split />
      <div>
        <OutputVars>
          <>
            <VarItem name='team' type='string' description='Team' />
            <VarItem name='judge_passed' type='boolean' description='Judge passed' />
            <VarItem name='judge_rating' type='number' description='Judge rating' />
            <VarItem name='judge_feedback' type='string' description='Judge feedback' />
            <VarItem name='categories' type='object' description='Category outcomes' />
            <VarItem name='team_points' type='number' description='Team points' />
            <VarItem name='total_points' type='number' description='Total points' />
          </>
        </OutputVars>
      </div>
    </div>
  )
}

export default memo(Panel)
