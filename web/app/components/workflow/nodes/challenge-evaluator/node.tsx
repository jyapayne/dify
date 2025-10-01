import type { FC } from 'react'
import React from 'react'
import type { NodeProps } from '@/app/components/workflow/types'
import type { ChallengeEvaluatorNodeType } from './types'

const Node: FC<NodeProps<ChallengeEvaluatorNodeType>> = ({ data }) => {
  const { evaluation_mode, success_type, success_pattern, challenge_id } = data
  return (
    <div className='mb-1 px-3 py-1'>
      {challenge_id ? (
        <div className='flex items-center gap-2'>
          <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>Challenge</div>
          <div className='truncate text-xs text-text-secondary' title={challenge_id}>{challenge_id}</div>
        </div>
      ) : (
        <div className='flex items-center gap-2'>
          <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>{evaluation_mode}</div>
          <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>{success_type}</div>
          {success_pattern && (
            <div className='min-w-0 truncate text-xs text-text-secondary' title={success_pattern}>"{success_pattern}"</div>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(Node)
