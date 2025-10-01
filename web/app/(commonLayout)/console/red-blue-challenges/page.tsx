'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react'
import { deleteRedBlueChallenge, listRedBlueChallenges, updateRedBlueChallenge } from '@/service/console/challenges'
import Button from '@/app/components/base/button'
import Toast from '@/app/components/base/toast'
import Confirm from '@/app/components/base/confirm'
import CreateRedBlueModal from './create-red-blue-modal'

export default function ConsoleRedBlueChallengesPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listRedBlueChallenges()
      setItems(data)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const confirmDelete = async () => {
    if (!pendingDeleteId)
      return
    try {
      await deleteRedBlueChallenge(pendingDeleteId)
      Toast.notify({ type: 'success', message: 'Challenge deleted' })
      await load()
    }
    catch (e: any) {
      Toast.notify({ type: 'error', message: e.message || 'Delete failed' })
    }
    finally {
      setPendingDeleteId(null)
    }
  }

  const handleToggleActive = async (item: any) => {
    try {
      await updateRedBlueChallenge(item.id, { is_active: !item.is_active })
      Toast.notify({ type: 'success', message: item.is_active ? 'Deactivated' : 'Activated' })
      await load()
    }
    catch (e: any) {
      Toast.notify({ type: 'error', message: e.message || 'Update failed' })
    }
  }

  return (
    <div className='flex h-full flex-col bg-components-panel-bg'>
      <div className='flex items-center justify-between border-b border-divider-subtle px-12 py-4'>
        <h1 className='text-xl font-semibold text-text-primary'>{t('challenges.redBlue.title')}</h1>
        <Button onClick={() => setShowModal(true)}>
          <RiAddLine className='h-4 w-4' />
          {t('challenges.console.createRedBlue')}
        </Button>
      </div>
      <div className='flex-1 overflow-y-auto px-12 py-6'>
        {loading ? (
          <div className='text-text-tertiary'>{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16'>
            <div className='mb-2 text-text-secondary'>{t('challenges.console.empty')}</div>
            <div className='text-sm text-text-tertiary'>{t('challenges.console.emptyDesc')}</div>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {items.map(item => (
              <div key={item.id} className='group relative rounded-xl border border-divider-subtle bg-components-panel-bg p-4 shadow-xs transition-shadow hover:shadow-md'>
                <div className='mb-2 flex items-start justify-between'>
                  <div className='text-base font-semibold text-text-primary'>{item.name}</div>
                  <div className='flex gap-1'>
                    <div className='rounded bg-util-colors-red-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-util-colors-red-red-700'>RED</div>
                    <div className='rounded bg-util-colors-blue-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-util-colors-blue-blue-700'>BLUE</div>
                  </div>
                </div>
                {item.description && (
                  <div className='mb-2 line-clamp-2 text-sm text-text-secondary'>{item.description}</div>
                )}
                <div className='mt-3 flex items-center justify-between'>
                  <div className={`rounded px-2 py-0.5 text-xs font-medium ${item.is_active ? 'bg-util-colors-green-green-100 text-util-colors-green-green-700' : 'bg-components-badge-gray text-text-tertiary'}`}>
                    {item.is_active ? t('challenges.console.status.active') : t('challenges.console.status.inactive')}
                  </div>
                  <div className='flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                    <Button
                      size='small'
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.is_active ? t('challenges.console.actions.deactivate') : t('challenges.console.actions.activate')}
                    </Button>
                    <Button
                      size='small'
                      variant='ghost'
                      onClick={() => setPendingDeleteId(item.id)}
                    >
                      <RiDeleteBinLine className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <CreateRedBlueModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            void load()
          }}
        />
      )}
      <Confirm
        isShow={Boolean(pendingDeleteId)}
        title={t('challenges.console.actions.deleteConfirm')}
        content={t('challenges.console.actions.deleteConfirm')}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
