import { useState } from 'react'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { Dialog } from '@/components/retroui/Dialog'
import { useChangePassword } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { mutate, isPending } = useChangePassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 4) {
      toast.error('Пароль должен быть минимум 4 символа')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Новые пароли не совпадают')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('Новый пароль должен отличаться от текущего')
      return
    }

    mutate(
      { currentPassword, newPassword },
      {
        onSuccess: (result) => {
          if (result.error) {
            const message = result.error === 'Неверный текущий пароль'
              ? 'Неверный текущий пароль'
              : result.error
            toast.error(message)
          } else {
            toast.success('Пароль успешно изменён')
            onClose()
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
          }
        },
        onError: () => {
          toast.error('Ошибка соединения')
        },
      }
    )
  }

  const handleClose = () => {
    if (!isPending) {
      onClose()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Content className="sm:max-w-md p-0" preventClose>
        <Dialog.Header>
          <span className="font-head text-lg">СМЕНА ПАРОЛЯ</span>
        </Dialog.Header>

        <div className="p-4">
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Введите текущий пароль и задайте новый
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Текущий пароль</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isPending}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Новый пароль</label>
              <Input
                type="password"
                placeholder="Минимум 4 символа"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isPending}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Подтвердите новый пароль</label>
              <Input
                type="password"
                placeholder="Повторите новый пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isPending}
                className="bg-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
              >
                {isPending ? 'Сохранение...' : 'Сменить пароль'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog.Content>
    </Dialog>
  )
}
