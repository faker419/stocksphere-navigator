import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  Plus,
  Minus,
  Warehouse,
} from 'lucide-react';

// Local types for mock data
interface Store {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

interface StockItem {
  store_id: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    code: string;
    unit: string;
    min_quantity: number;
    category: string;
    created_at: string;
  };
}

// Mock data
const mockStores: Store[] = [
  { id: '1', name: 'Main Warehouse', location: 'Building A', is_active: true },
  { id: '2', name: 'Production Store', location: 'Building B', is_active: true },
  { id: '3', name: 'Emergency Store', location: 'Building C', is_active: true },
];

const mockStockItems: StockItem[] = [
  {
    store_id: '1',
    quantity: 45,
    item: { id: '1', name: 'Hydraulic Pump', code: 'HP-001', unit: 'pcs', min_quantity: 10, category: 'Pumps', created_at: '' },
  },
  {
    store_id: '1',
    quantity: 8,
    item: { id: '2', name: 'Ball Bearings', code: 'BB-050', unit: 'pcs', min_quantity: 50, category: 'Bearings', created_at: '' },
  },
  {
    store_id: '1',
    quantity: 120,
    item: { id: '3', name: 'Conveyor Belt', code: 'CB-445', unit: 'meters', min_quantity: 20, category: 'Belts', created_at: '' },
  },
  {
    store_id: '1',
    quantity: 25,
    item: { id: '4', name: 'Lubricating Oil', code: 'LO-001', unit: 'liters', min_quantity: 50, category: 'Lubricants', created_at: '' },
  },
  {
    store_id: '1',
    quantity: 200,
    item: { id: '5', name: 'Safety Gloves', code: 'SG-001', unit: 'pairs', min_quantity: 100, category: 'Safety', created_at: '' },
  },
  {
    store_id: '1',
    quantity: 15,
    item: { id: '6', name: 'Filter Element', code: 'FE-200', unit: 'pcs', min_quantity: 30, category: 'Filters', created_at: '' },
  },
];

const Inventory = () => {
  const { hasPrivilege } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string>(mockStores[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');

  const canAdjustStock = hasPrivilege('can_adjust_stock');

  const filteredStock = mockStockItems.filter((stock) => {
    const matchesSearch =
      stock.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.item.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLowStock = !showLowStock || stock.quantity < stock.item.min_quantity;

    return matchesSearch && matchesLowStock && stock.store_id === selectedStore;
  });

  const lowStockCount = mockStockItems.filter(
    (s) => s.quantity < s.item.min_quantity
  ).length;

  const totalItems = mockStockItems.reduce((acc, s) => acc + s.quantity, 0);

  const handleAdjustStock = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustQuantity('');
    setAdjustReason('');
    setAdjustType('add');
    setIsAdjustOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Overview</h1>
          <p className="mt-1 text-muted-foreground">
            Manage inventory across all stores
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="metric">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="metric">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-warning/10 p-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="metric">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-secondary p-3">
                <Warehouse className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mockStores.length}</p>
                <p className="text-sm text-muted-foreground">Active Stores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[200px]">
                <Warehouse className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select Store" />
              </SelectTrigger>
              <SelectContent>
                {mockStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showLowStock ? 'default' : 'outline'}
              onClick={() => setShowLowStock(!showLowStock)}
              className="gap-2"
            >
              <TrendingDown className="h-4 w-4" />
              Low Stock Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">Min Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {canAdjustStock && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((stock) => {
                  const isLowStock = stock.quantity < stock.item.min_quantity;
                  return (
                    <TableRow
                      key={stock.item.id}
                      className={`border-border transition-colors hover:bg-muted/50 ${
                        isLowStock ? 'bg-warning/5' : ''
                      }`}
                    >
                      <TableCell className="font-medium">{stock.item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{stock.item.code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stock.item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={isLowStock ? 'font-bold text-warning' : ''}>
                          {stock.quantity}
                        </span>{' '}
                        <span className="text-muted-foreground">{stock.item.unit}</span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {stock.item.min_quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {isLowStock ? (
                          <Badge variant="warning" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </TableCell>
                      {canAdjustStock && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustStock(stock)}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {filteredStock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canAdjustStock ? 7 : 6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <p>No items found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedItem?.item.name} ({selectedItem?.item.code})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Current Quantity</span>
              <span className="font-bold">
                {selectedItem?.quantity} {selectedItem?.item.unit}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={adjustType === 'add' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAdjustType('add')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
              <Button
                variant={adjustType === 'remove' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setAdjustType('remove')}
              >
                <Minus className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for adjustment..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={adjustType === 'add' ? 'default' : 'destructive'}
              disabled={!adjustQuantity || !adjustReason}
            >
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
