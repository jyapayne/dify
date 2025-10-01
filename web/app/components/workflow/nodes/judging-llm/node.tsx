import type { FC } from 'react'
import React from 'react'
import type { NodeProps } from '@/app/components/workflow/types'
import ModelSelector from '@/app/components/header/account-setting/model-provider-page/model-selector'
import { useTextGenerationCurrentProviderAndModelAndModelList } from '@/app/components/header/account-setting/model-provider-page/hooks'
import type { JudgingLLMNodeType } from './types'

const Node: FC<NodeProps<JudgingLLMNodeType>> = ({ data }) => {
  const { judge_model, pass_threshold } = data
  const hasSetModel = !!(judge_model?.provider && judge_model?.name)
  const { textGenerationModelList } = useTextGenerationCurrentProviderAndModelAndModelList()

  if (!hasSetModel)
    return null

  return (
    <div className='mb-1 px-3 py-1'>
      <div className='flex items-center gap-2'>
        <ModelSelector
          defaultModel={{ provider: judge_model!.provider, model: judge_model!.name }}
          modelList={textGenerationModelList}
          triggerClassName='!h-6 !rounded-md'
          readonly
        />
        <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>
          Pass ≥ {pass_threshold ?? 7}
        </div>
      </div>
    </div>
  )
}

export default React.memo(Node)
