'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/app/components/base/modal'
import Button from '@/app/components/base/button'
import Input from '@/app/components/base/input'
import Textarea from '@/app/components/base/textarea'
import Switch from '@/app/components/base/switch'
import Toast from '@/app/components/base/toast'
import Select from '@/app/components/base/select'
import { createConsoleChallenge } from '@/service/console/challenges'
import { useAppFullList } from '@/service/use-apps'
import { useAppWorkflow } from '@/service/use-workflow'

type Props = {
  show: boolean
  onHide: () => void
  onSuccess: () => void
}

export default function CreateChallengeModal({ show, onHide, onSuccess }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    app_id: '',
    workflow_id: '',
    name: '',
    description: '',
    goal: '',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)

  const { data: appsData } = useAppFullList()
  const apps = appsData?.data || []
  const { data: workflowData } = useAppWorkflow(form.app_id)
  const hasWorkflow = !!workflowData?.graph

  const handleSubmit = async () => {
    if (!form.app_id || !form.name) {
      Toast.notify({ type: 'error', message: 'App ID and Name are required' })
      return
    }

    setLoading(true)
    try {
      await createConsoleChallenge(form)
      Toast.notify({ type: 'success', message: 'Challenge created successfully' })
      onSuccess()
    }
    catch (e: any) {
      Toast.notify({ type: 'error', message: e.message || 'Failed to create challenge' })
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isShow={show}
      onClose={onHide}
      title={t('challenges.console.create')}
      className='!max-w-[640px]'
    >
      <div className='space-y-4 p-8'>
        <div>
          <label className='mb-2 block text-sm font-medium text-text-secondary'>
            {t('challenges.console.form.appId')} <span className='text-text-destructive'>*</span>
          </label>
          <Select
            className='w-full'
            defaultValue={form.app_id}
            onSelect={item => setForm({ ...form, app_id: item.value as string, workflow_id: '' })}
            placeholder={t('common.placeholder.select')}
            items={apps.map(app => ({
              value: app.id,
              name: app.name,
            }))}
          />
        </div>

        {form.app_id && hasWorkflow && (
          <div>
            <label className='mb-2 block text-sm font-medium text-text-secondary'>
              {t('challenges.console.form.workflowId')}
            </label>
            <div className='flex items-center gap-2'>
              <Input
                className='flex-1'
                value={workflowData?.id || ''}
                disabled
              />
              <Button
                size='small'
                onClick={() => setForm({ ...form, workflow_id: workflowData?.id || '' })}
              >
                Use Workflow
              </Button>
            </div>
            <div className='mt-1 text-xs text-text-tertiary'>
              {workflowData?.id ? `Workflow ID: ${workflowData.id}` : 'No workflow published'}
            </div>
          </div>
        )}

        <div>
          <label className='mb-2 block text-sm font-medium text-text-secondary'>
            {t('challenges.console.form.name')} <span className='text-text-destructive'>*</span>
          </label>
          <Input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder={t('challenges.console.form.namePlaceholder')}
          />
        </div>

        <div>
          <label className='mb-2 block text-sm font-medium text-text-secondary'>
            {t('challenges.console.form.description')}
          </label>
          <Textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder={t('challenges.console.form.descriptionPlaceholder')}
            rows={3}
          />
        </div>

        <div>
          <label className='mb-2 block text-sm font-medium text-text-secondary'>
            {t('challenges.console.form.goal')}
          </label>
          <Textarea
            value={form.goal}
            onChange={e => setForm({ ...form, goal: e.target.value })}
            placeholder={t('challenges.console.form.goalPlaceholder')}
            rows={2}
          />
          <div className='mt-1 text-xs text-text-tertiary'>
            This will be shown to players. Challenge logic is defined in the workflow using Challenge Evaluator nodes.
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium text-text-secondary'>
            {t('challenges.console.form.isActive')}
          </label>
          <Switch
            defaultValue={form.is_active}
            onChange={v => setForm({ ...form, is_active: v })}
          />
        </div>

        <div className='flex justify-end gap-2 pt-4'>
          <Button onClick={onHide}>{t('common.operation.cancel')}</Button>
          <Button variant='primary' onClick={handleSubmit} loading={loading}>
            {t('common.operation.create')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
