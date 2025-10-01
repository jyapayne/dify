import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { NodePanelProps } from '@/app/components/workflow/types'
import Field from '@/app/components/workflow/nodes/_base/components/field'
import Split from '@/app/components/workflow/nodes/_base/components/split'
import VarReferencePicker from '@/app/components/workflow/nodes/_base/components/variable/var-reference-picker'
import OutputVars, { VarItem } from '@/app/components/workflow/nodes/_base/components/output-vars'
import ModelParameterModal from '@/app/components/header/account-setting/model-provider-page/model-parameter-modal'
import { fetchAndMergeValidCompletionParams } from '@/utils/completion-params'
import Toast from '@/app/components/base/toast'
import AddButton2 from '@/app/components/base/button/add-button'
import Editor from '@/app/components/workflow/nodes/_base/components/prompt/editor'
import useAvailableVarList from '@/app/components/workflow/nodes/_base/hooks/use-available-var-list'
import Input from '@/app/components/base/input'
import type { JudgingLLMNodeType } from './types'
import useNodeCrud from '@/app/components/workflow/nodes/_base/hooks/use-node-crud'
import produce from 'immer'

const Panel: FC<NodePanelProps<JudgingLLMNodeType>> = ({ id, data }) => {
  const { t } = useTranslation()
  const { inputs, setInputs } = useNodeCrud<JudgingLLMNodeType>(id, data)
  const filterVar = useMemo(() => (_: any) => true, [])
  const { availableVars, availableNodesWithParent } = useAvailableVarList(id, { onlyLeafNodeVar: false, filterVar })

  return (
    <div className='pt-2'>
      <div className='space-y-4 px-4 pb-4'>
        <Field title={t('workflow.common.model')} required>
          <ModelParameterModal
            popupClassName='!w-[387px]'
            isInWorkflow
            isAdvancedMode={true}
            mode={data.judge_model?.mode}
            provider={data.judge_model?.provider}
            completionParams={data.judge_model?.completion_params}
            modelId={data.judge_model?.name}
            setModel={async (model: { provider: string; modelId: string; mode?: string }) => {
              try {
                const { params } = await fetchAndMergeValidCompletionParams(
                  model.provider,
                  model.modelId,
                  data.judge_model?.completion_params || {},
                  true,
                )
                setInputs(produce(inputs, (draft) => {
                  (draft as any).judge_model = {
                    provider: model.provider,
                    name: model.modelId,
                    mode: model.mode || 'chat',
                    completion_params: params,
                  }
                }))
              }
              catch {
                Toast.notify({ type: 'error', message: t('common.error') })
                setInputs(produce(inputs, (draft) => {
                  (draft as any).judge_model = {
                    provider: model.provider,
                    name: model.modelId,
                    mode: model.mode || 'chat',
                    completion_params: {},
                  }
                }))
              }
            }}
            onCompletionParamsChange={newParams => setInputs(produce(inputs, (draft) => { (draft as any).judge_model.completion_params = newParams }))}
            hideDebugWithMultipleModel
            debugWithMultipleModel={false}
            readonly={false}
          />
        </Field>
        <Field title='Rubric Template' required>
          <div className='space-y-2'>
            <Editor
              title={<div className='text-xs font-semibold uppercase text-text-secondary'>system</div>}
              value={data.rubric_prompt_template || ''}
              onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).rubric_prompt_template = v }))}
              readOnly={false}
              isShowContext={false}
              isChatApp
              isChatModel
              hasSetBlockStatus={{ history: false, query: false, context: false }}
              nodesOutputVars={availableVars}
              availableNodes={availableNodesWithParent}
              isSupportFileVar
            />
            <div className='flex items-center gap-2'>
              <AddButton2 onClick={() => setInputs(produce(inputs, (draft) => { (draft as any).rubric_prompt_template = 'You are a strict evaluator. Given a goal and a model response, decide pass/fail, give a rating 0-10, and provide concise feedback.\\n\\nGoal:\\n{goal}\\n\\nResponse:\\n{response}\\n\\nReturn JSON: {"passed": boolean, "rating": number, "feedback": string}.' }))} />
              <div className='system-xs-medium-uppercase text-text-tertiary'>Insert default rubric</div>
            </div>
          </div>
        </Field>
        <Field title='Pass Threshold'>
          <Input
            type='number'
            wrapperClassName='w-full'
            min={0}
            max={data.rating_scale || 10}
            value={data.pass_threshold ?? 7}
            onChange={e => setInputs(produce(inputs, (draft) => { (draft as any).pass_threshold = Number(e.target.value) }))}
          />
        </Field>
        <Field title='Inputs'>
          <div className='space-y-2'>
            <div>
              <div className='system-xs-medium-uppercase mb-1 text-text-tertiary'>Goal</div>
              <VarReferencePicker
                nodeId={id}
                isShowNodeName
                readonly={false}
                value={data.inputs?.goal || []}
                onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).inputs = { ...(draft as any).inputs, goal: v } }))}
              />
            </div>
            <div>
              <div className='system-xs-medium-uppercase mb-1 text-text-tertiary'>Response</div>
              <VarReferencePicker
                nodeId={id}
                isShowNodeName
                readonly={false}
                value={data.inputs?.response || []}
                onChange={v => setInputs(produce(inputs, (draft) => { (draft as any).inputs = { ...(draft as any).inputs, response: v } }))}
              />
            </div>
          </div>
        </Field>
      </div>
      <Split />
      <div>
        <OutputVars>
          <>
            <VarItem name='judge_passed' type='boolean' description={t('workflow.nodes.judgingLLM.outputVars.judgePassed')} />
            <VarItem name='judge_rating' type='number' description={t('workflow.nodes.judgingLLM.outputVars.judgeRating')} />
            <VarItem name='judge_feedback' type='string' description={t('workflow.nodes.judgingLLM.outputVars.judgeFeedback')} />
          </>
        </OutputVars>
      </div>
    </div>
  )
}

export default memo(Panel)
