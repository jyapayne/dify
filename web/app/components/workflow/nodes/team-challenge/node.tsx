import type { FC } from 'react'
import React from 'react'
import type { NodeProps } from '@/app/components/workflow/types'
import type { TeamChallengeNodeType } from './types'

const Node: FC<NodeProps<TeamChallengeNodeType>> = ({ data }) => {
  const { red_blue_challenge_id, defense_selection_policy, attack_selection_policy } = data
  return (
    <div className='mb-1 px-3 py-1'>
      {red_blue_challenge_id ? (
        <div className='flex items-center gap-2'>
          <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>Red/Blue</div>
          <div className='truncate text-xs text-text-secondary' title={red_blue_challenge_id}>{red_blue_challenge_id}</div>
        </div>
      ) : (
        <div className='flex items-center gap-2'>
          <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>Defense: {defense_selection_policy}</div>
          <div className='rounded bg-components-badge-white-to-dark px-1 py-0.5 text-[10px] font-semibold uppercase text-text-tertiary'>Attack: {attack_selection_policy}</div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Node)
