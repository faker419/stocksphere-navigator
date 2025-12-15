import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  Trash2,
} from 'lucide-react';
import { Notification } from '@/lib/api';
import { cn } from '@/lib/utils';

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: '1',
    title: 'Request Approved',
    message: 'Your request REQ-2024-045 for Hydraulic Pump has been approved by John Doe.',
    type: 'success',
    is_read: false,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    user_id: '1',
    title: 'Low Stock Alert',
    message: 'Ball Bearings (BB-050) is below minimum threshold. Current: 8, Minimum: 50',
    type: 'warning',
    is_read: false,
    created_at: '2024-01-15T09:15:00Z',
  },
  {
    id: '3',
    user_id: '1',
    title: 'New Request Pending',
    message: 'A new request REQ-2024-048 requires your approval.',
    type: 'info',
    is_read: true,
    created_at: '2024-01-14T16:45:00Z',
  },
  {
    id: '4',
    user_id: '1',
    title: 'Request Rejected',
    message: 'Request REQ-2024-044 was rejected. Reason: Insufficient stock available.',
    type: 'error',
    is_read: true,
    created_at: '2024-01-14T11:20:00Z',
  },
  {
    id: '5',
    user_id: '1',
    title: 'Maintenance Reminder',
    message: 'Scheduled maintenance for Conveyor Belt CB-01 is due tomorrow.',
    type: 'warning',
    is_read: true,
    created_at: '2024-01-13T14:00:00Z',
  },
  {
    id: '6',
    user_id: '1',
    title: 'Order Fulfilled',
    message: 'Request REQ-2024-042 has been fulfilled and dispatched from Main Warehouse.',
    type: 'success',
    is_read: true,
    created_at: '2024-01-13T10:30:00Z',
  },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                  <Bell className="h-12 w-12" />
                  <div className="text-center">
                    <p className="font-medium">No notifications</p>
                    <p className="text-sm">You're all caught up!</p>
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-4 p-4 transition-colors',
                      !notification.is_read && 'bg-primary/5'
                    )}
                  >
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{notification.title}</p>
                        {!notification.is_read && (
                          <Badge variant="default" className="h-5 text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
