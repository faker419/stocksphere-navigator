import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'warning' | 'success';
}

const MetricCard = ({ title, value, description, icon: Icon, trend, variant = 'default' }: MetricCardProps) => {
  const iconColors = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };

  return (
    <Card variant="metric" className="group cursor-default">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`rounded-xl p-3 ${iconColors[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              <TrendingUp className={`h-3 w-3 ${!trend.positive && 'rotate-180'}`} />
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ActivityItem {
  id: string;
  type: 'request' | 'approval' | 'fulfillment' | 'stock';
  title: string;
  description: string;
  time: string;
  status?: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'request',
    title: 'New Request #REQ-2024-001',
    description: 'Hydraulic Pump for Machine A-12',
    time: '10 min ago',
    status: 'pending',
  },
  {
    id: '2',
    type: 'approval',
    title: 'Request Approved',
    description: 'Ball Bearings (50 units) approved by John D.',
    time: '25 min ago',
    status: 'approved',
  },
  {
    id: '3',
    type: 'fulfillment',
    title: 'Order Fulfilled',
    description: 'Conveyor Belt #CB-445 dispatched from Store A',
    time: '1 hour ago',
    status: 'fulfilled',
  },
  {
    id: '4',
    type: 'stock',
    title: 'Low Stock Alert',
    description: 'Lubricating Oil below minimum threshold',
    time: '2 hours ago',
    status: 'warning',
  },
];

interface PendingTask {
  id: string;
  type: 'approval' | 'fulfillment';
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestNumber: string;
}

const pendingTasks: PendingTask[] = [
  { id: '1', type: 'approval', title: 'Review Filter Replacement Request', priority: 'high', requestNumber: 'REQ-2024-045' },
  { id: '2', type: 'fulfillment', title: 'Dispatch Safety Gloves', priority: 'medium', requestNumber: 'REQ-2024-042' },
  { id: '3', type: 'approval', title: 'Motor Upgrade Request', priority: 'critical', requestNumber: 'REQ-2024-048' },
];

const Dashboard = () => {
  const { user, hasPrivilege } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0] || user?.username}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's what's happening in your inventory management system
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Open Requests"
          value={12}
          description="3 pending approval"
          icon={FileText}
          trend={{ value: 8, positive: false }}
        />
        <MetricCard
          title="Low Stock Items"
          value={7}
          description="Action required"
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCard
          title="Items in Stock"
          value={1284}
          description="Across 4 stores"
          icon={Package}
          trend={{ value: 12, positive: true }}
        />
        <MetricCard
          title="Fulfilled Today"
          value={24}
          description="98% fulfillment rate"
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card variant="default" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from the system</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/notifications">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-0.5">
                    {activity.type === 'request' && (
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                    )}
                    {activity.type === 'approval' && (
                      <div className="rounded-lg bg-emerald-500/10 p-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}
                    {activity.type === 'fulfillment' && (
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {activity.type === 'stock' && (
                      <div className="rounded-lg bg-warning/10 p-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      {activity.status && (
                        <Badge variant={activity.status as any} className="text-xs">
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card variant="default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Tasks
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority} className="text-xs">
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{task.requestNumber}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {hasPrivilege('can_approve_requests') && (
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link to="/requests">View All Tasks</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {hasPrivilege('can_create_requests') && (
              <Button variant="default" asChild>
                <Link to="/requests">
                  <FileText className="mr-2 h-4 w-4" />
                  New Request
                </Link>
              </Button>
            )}
            {hasPrivilege('can_view_stock') && (
              <Button variant="outline" asChild>
                <Link to="/inventory">
                  <Package className="mr-2 h-4 w-4" />
                  View Inventory
                </Link>
              </Button>
            )}
            {hasPrivilege('can_view_machinery') && (
              <Button variant="outline" asChild>
                <Link to="/machinery">
                  <Wrench className="mr-2 h-4 w-4" />
                  Machinery Status
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
