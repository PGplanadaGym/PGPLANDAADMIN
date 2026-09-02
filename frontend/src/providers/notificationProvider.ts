import type { NotificationProvider } from '@refinedev/core'
import { toast } from 'sonner'

export const notificationProvider: NotificationProvider = {
  open: ({ message, description, type, key }) => {
    const opciones = { id: key, description }

    if (type === 'success') {
      toast.success(message, opciones)
    } else if (type === 'error') {
      toast.error(message, opciones)
    } else {
      toast(message, opciones)
    }
  },
  close: (key) => {
    toast.dismiss(key)
  },
}
