import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Package,
  Wrench,
  Users,
  Shield,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  privilege?: string;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Requests', href: '/requests', icon: FileText, privilege: 'can_view_requests' },
  { title: 'Inventory', href: '/inventory', icon: Package, privilege: 'can_view_stock' },
  { title: 'Machinery', href: '/machinery', icon: Wrench, privilege: 'can_view_machinery' },
];

const adminNavItems: NavItem[] = [
  { title: 'Users', href: '/admin/users', icon: Users, privilege: 'can_manage_users' },
  { title: 'Roles', href: '/admin/roles', icon: Shield, privilege: 'can_manage_roles' },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { user, logout, hasPrivilege } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const filterNavItems = (items: NavItem[]) =>
    items.filter(item => !item.privilege || hasPrivilege(item.privilege));

  const visibleMainItems = filterNavItems(mainNavItems);
  const visibleAdminItems = filterNavItems(adminNavItems);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">DSMS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {visibleMainItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive(item.href) && 'bg-primary/10 text-primary'
              )}
              activeClassName="bg-primary/10 text-primary"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </div>

        {visibleAdminItems.length > 0 && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
            )}
            <div className="space-y-1">
              {visibleAdminItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive(item.href) && 'bg-primary/10 text-primary'
                  )}
                  activeClassName="bg-primary/10 text-primary"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              ))}
            </div>
          </>
        )}

        <Separator className="my-4 bg-sidebar-border" />
        <NavLink
          to="/notifications"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isActive('/notifications') && 'bg-primary/10 text-primary'
          )}
          activeClassName="bg-primary/10 text-primary"
        >
          <Bell className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Notifications</span>}
        </NavLink>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2',
            collapsed && 'justify-center'
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.full_name || user?.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            'mt-2 w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
};
