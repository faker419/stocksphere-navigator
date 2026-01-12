import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Shield,
  Edit,
  Trash2,
  Users,
  Eye,
  FileText,
  Package,
  Wrench,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Local types for mock data
interface Privilege {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  privileges?: Privilege[];
  userCount?: number;
}

// Mock data
const mockPrivileges: Privilege[] = [
  // Requests
  { id: '1', name: 'can_view_requests', description: 'View all requests', category: 'Requests' },
  { id: '2', name: 'can_create_requests', description: 'Create new requests', category: 'Requests' },
  { id: '3', name: 'can_approve_requests', description: 'Approve or reject requests', category: 'Requests' },
  { id: '4', name: 'can_fulfill_requests', description: 'Fulfill approved requests', category: 'Requests' },
  // Inventory
  { id: '5', name: 'can_view_stock', description: 'View stock levels', category: 'Inventory' },
  { id: '6', name: 'can_adjust_stock', description: 'Adjust stock quantities', category: 'Inventory' },
  // Machinery
  { id: '7', name: 'can_view_machinery', description: 'View machinery list', category: 'Machinery' },
  { id: '8', name: 'can_manage_machinery', description: 'Add/edit machinery', category: 'Machinery' },
  // Admin
  { id: '9', name: 'can_manage_users', description: 'Manage user accounts', category: 'Administration' },
  { id: '10', name: 'can_manage_roles', description: 'Manage roles and permissions', category: 'Administration' },
];

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access with all privileges',
    privileges: mockPrivileges,
    userCount: 2,
  },
  {
    id: '2',
    name: 'Stock Manager',
    description: 'Manage inventory and fulfill requests',
    privileges: mockPrivileges.filter((p) =>
      ['can_view_requests', 'can_fulfill_requests', 'can_view_stock', 'can_adjust_stock'].includes(p.name)
    ),
    userCount: 5,
  },
  {
    id: '3',
    name: 'Requester',
    description: 'Create and track requests',
    privileges: mockPrivileges.filter((p) =>
      ['can_view_requests', 'can_create_requests'].includes(p.name)
    ),
    userCount: 25,
  },
  {
    id: '4',
    name: 'Approver',
    description: 'Review and approve requests',
    privileges: mockPrivileges.filter((p) =>
      ['can_view_requests', 'can_approve_requests', 'can_view_stock'].includes(p.name)
    ),
    userCount: 8,
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  Requests: FileText,
  Inventory: Package,
  Machinery: Wrench,
  Administration: Settings,
};

const RolesPage = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(mockRoles[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);

  // Group privileges by category
  const privilegesByCategory = mockPrivileges.reduce((acc, privilege) => {
    const category = privilege.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(privilege);
    return acc;
  }, {} as Record<string, Privilege[]>);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPrivileges(role.privileges?.map((p) => p.id) || []);
    setIsEditMode(false);
  };

  const togglePrivilege = (privilegeId: string) => {
    setSelectedPrivileges((prev) =>
      prev.includes(privilegeId)
        ? prev.filter((id) => id !== privilegeId)
        : [...prev, privilegeId]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Privileges</h1>
          <p className="mt-1 text-muted-foreground">
            Manage roles and their associated permissions
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - Role List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Roles</CardTitle>
            <CardDescription>{mockRoles.length} roles defined</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-1 p-2">
                {mockRoles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={cn(
                      'w-full rounded-lg p-3 text-left transition-all',
                      selectedRole?.id === role.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <p className="font-medium text-foreground">{role.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {role.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        {role.userCount}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {role.privileges?.length} privileges
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Role Details */}
        <Card className="lg:col-span-2">
          {selectedRole ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {selectedRole.name}
                  </CardTitle>
                  <CardDescription>{selectedRole.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditMode(false)}>
                        Cancel
                      </Button>
                      <Button>Save Changes</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsEditMode(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-6">
                    {Object.entries(privilegesByCategory).map(([category, privileges]) => {
                      const CategoryIcon = categoryIcons[category] || Eye;
                      return (
                        <div key={category} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium text-foreground">{category}</h3>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {privileges.map((privilege) => {
                              const isChecked = selectedPrivileges.includes(privilege.id);
                              return (
                                <label
                                  key={privilege.id}
                                  className={cn(
                                    'flex items-start gap-3 rounded-lg border p-3 transition-all',
                                    isEditMode
                                      ? 'cursor-pointer hover:bg-muted/50'
                                      : 'cursor-default',
                                    isChecked
                                      ? 'border-primary/30 bg-primary/5'
                                      : 'border-border'
                                  )}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={!isEditMode}
                                    onCheckedChange={() => togglePrivilege(privilege.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-medium">{privilege.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {privilege.description}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4" />
                <p>Select a role to view details</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific privileges
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role_name">Role Name</Label>
              <Input id="role_name" placeholder="e.g., Supervisor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role_description">Description</Label>
              <Textarea
                id="role_description"
                placeholder="Describe the role's responsibilities..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button>Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPage;
