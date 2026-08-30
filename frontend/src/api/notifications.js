import client from './client'

export const listNotifications = () => client.get('/notifications')
export const getUnreadCount = () => client.get('/notifications/unread-count')
export const markRead = (id) => client.patch(`/notifications/${id}/read`)
export const markAllRead = () => client.patch('/notifications/read-all')
