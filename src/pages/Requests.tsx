import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// Local types for mock data
interface MockUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface MockItem {
  id: string;
  name: string;
  code: string;
  unit: string;
  min_quantity: number;
  created_at: string;
}

interface Request {
  id: string;
  request_number: string;
  requester_id: string;
  requester: MockUser;
  item_id: string;
  item: MockItem;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  reason: string;
  created_at: string;
  updated_at: string;
}

// Mock items for the create form
const mockItems = [
  { id: '1', name: 'Hydraulic Pump', code: 'HP-001', unit: 'pcs' },
  { id: '2', name: 'Ball Bearings', code: 'BB-050', unit: 'pcs' },
  { id: '3', name: 'Conveyor Belt', code: 'CB-445', unit: 'meters' },
  { id: '4', name: 'Lubricating Oil', code: 'LO-001', unit: 'liters' },
  { id: '5', name: 'Filter Cartridge', code: 'FC-200', unit: 'pcs' },
];

// Mock data for demonstration
const mockRequests: Request[] = [
  {
    id: '1',
    request_number: 'REQ-2024-001',
    requester_id: '1',
    requester: { id: '1', username: 'john.doe', email: 'john@example.com', full_name: 'John Doe', is_active: true, created_at: '' },
    item_id: '1',
    item: { id: '1', name: 'Hydraulic Pump', code: 'HP-001', unit: 'pcs', min_quantity: 5, created_at: '' },
    quantity: 2,
    priority: 'high',
    status: 'pending',
    reason: 'Replacement for Machine A-12',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    request_number: 'REQ-2024-002',
    requester_id: '2',
    requester: { id: '2', username: 'jane.smith', email: 'jane@example.com', full_name: 'Jane Smith', is_active: true, created_at: '' },
    item_id: '2',
    item: { id: '2', name: 'Ball Bearings', code: 'BB-050', unit: 'pcs', min_quantity: 100, created_at: '' },
    quantity: 50,
    priority: 'medium',
    status: 'approved',
    reason: 'Scheduled maintenance',
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-14T16:45:00Z',
  },
  {
    id: '3',
    request_number: 'REQ-2024-003',
    requester_id: '3',
    requester: { id: '3', username: 'bob.wilson', email: 'bob@example.com', full_name: 'Bob Wilson', is_active: true, created_at: '' },
    item_id: '3',
    item: { id: '3', name: 'Conveyor Belt', code: 'CB-445', unit: 'meters', min_quantity: 10, created_at: '' },
    quantity: 5,
    priority: 'critical',
    status: 'fulfilled',
    reason: 'Emergency replacement',
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-13T15:30:00Z',
  },
  {
    id: '4',
    request_number: 'REQ-2024-004',
    requester_id: '1',
    requester: { id: '1', username: 'john.doe', email: 'john@example.com', full_name: 'John Doe', is_active: true, created_at: '' },
    item_id: '4',
    item: { id: '4', name: 'Lubricating Oil', code: 'LO-001', unit: 'liters', min_quantity: 50, created_at: '' },
    quantity: 20,
    priority: 'low',
    status: 'rejected',
    reason: 'Regular refill',
    created_at: '2024-01-12T11:15:00Z',
    updated_at: '2024-01-12T14:00:00Z',
  },
];

const priorityVariants: Record<Request['priority'], BadgeProps['variant']> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

const statusVariants: Record<Request['status'], BadgeProps['variant']> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  fulfilled: 'fulfilled',
  cancelled: 'cancelled',
};

const Requests = () => {
  const { hasPrivilege, user } = useAuth();
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    item_id: '',
    quantity: '',
    priority: 'medium',
    reason: '',
  });

  const canApprove = hasPrivilege('can_approve_requests');
  const canFulfill = hasPrivilege('can_fulfill_requests');

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester?.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewRequest = (request: Request) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const handleCreateRequest = () => {
    if (!createForm.item_id || !createForm.quantity || !createForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedItem = mockItems.find(i => i.id === createForm.item_id);
    if (!selectedItem) return;

    const newRequest: Request = {
      id: String(requests.length + 1),
      request_number: `REQ-2024-${String(requests.length + 1).padStart(3, '0')}`,
      requester_id: String(user?.id) || '1',
      requester: {
        id: String(user?.id) || '1',
        username: user?.username || 'current.user',
        email: user?.email || 'user@example.com',
        full_name: user?.full_name || 'Current User',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      item_id: createForm.item_id,
      item: {
        id: selectedItem.id,
        name: selectedItem.name,
        code: selectedItem.code,
        unit: selectedItem.unit,
        min_quantity: 0,
        created_at: '',
      },
      quantity: parseInt(createForm.quantity),
      priority: createForm.priority as Request['priority'],
      status: 'pending',
      reason: createForm.reason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setRequests([newRequest, ...requests]);
    setIsCreateOpen(false);
    setCreateForm({ item_id: '', quantity: '', priority: 'medium', reason: '' });
    toast.success('Request created successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requests Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track all stock requests
          </p>
        </div>
        <Button variant="default" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by request #, item, or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[140px]">Request #</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer border-border transition-colors hover:bg-muted/50"
                    onClick={() => handleViewRequest(request)}
                  >
                    <TableCell className="font-medium text-primary">
                      {request.request_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.item?.name}</p>
                        <p className="text-xs text-muted-foreground">{request.item?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{request.requester?.full_name}</TableCell>
                    <TableCell className="text-center">
                      {request.quantity} {request.item?.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={priorityVariants[request.priority]}>{request.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariants[request.status]}>{request.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleViewRequest(request)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canApprove && request.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="text-success hover:text-success">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canFulfill && request.status === 'approved' && (
                          <Button variant="ghost" size="icon" className="text-primary hover:text-primary">
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8" />
                        <p>No requests found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Request Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
            <DialogDescription>Submit a new stock request for approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item *</Label>
              <Select
                value={createForm.item_id}
                onValueChange={(value) => setCreateForm({ ...createForm, item_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {mockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={createForm.quantity}
                onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={createForm.priority}
                onValueChange={(value) => setCreateForm({ ...createForm, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Describe why this item is needed..."
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-primary">{selectedRequest?.request_number}</span>
              {selectedRequest && (
                <Badge variant={statusVariants[selectedRequest.status]}>
                  {selectedRequest.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Request details and actions</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Item</p>
                  <p className="font-medium">{selectedRequest.item?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.item?.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium">
                    {selectedRequest.quantity} {selectedRequest.item?.unit}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <p className="font-medium">{selectedRequest.requester?.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant={priorityVariants[selectedRequest.priority]}>{selectedRequest.priority}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="text-sm">{selectedRequest.reason}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Created: {formatDate(selectedRequest.created_at)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            {canApprove && selectedRequest?.status === 'pending' && (
              <>
                <Button variant="destructive">Reject</Button>
                <Button>Approve</Button>
              </>
            )}
            {canFulfill && selectedRequest?.status === 'approved' && (
              <Button>Fulfill Request</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Requests;
