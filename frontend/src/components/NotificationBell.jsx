import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as notifApi from '../api/notifications'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()

  const loadUnread = async () => {
    try {
      const res = await notifApi.getUnreadCount()
      setUnreadCount(res.data.count)
    } catch (err) {
      console.error(err)
    }
  }

  const loadNotifications = async () => {
    try {
      const res = await notifApi.listNotifications()
      setNotifications(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = async () => {
    if (!open) {
      await loadNotifications()
    }
    setOpen((o) => !o)
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notifApi.markRead(notif.id)
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch (err) {
        console.error(err)
      }
    }
    setOpen(false)
    if (notif.resource_type === 'folder' && notif.resource_id) {
      navigate('/?folder=' + notif.resource_id)
    } else {
      navigate('/shared')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notifApi.markAllRead()
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-3 bg-[#A63D40] text-[#F7F4EA] text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center px-4 py-3 border-b border-[#1B2A41]/10">
            <p className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="font-mono text-[11px] text-[#B08D57] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-[#1B2A41]/50 text-center py-8">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={"w-full text-left px-4 py-3 border-b border-[#1B2A41]/5 hover:bg-[#1B2A41]/5 transition-colors " + (n.read ? '' : 'bg-[#B08D57]/10')}
              >
                <p className="text-sm text-[#1B2A41]">{n.message}</p>
                <p className="font-mono text-[11px] text-[#1B2A41]/50 mt-1">{formatDate(n.created_at)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
