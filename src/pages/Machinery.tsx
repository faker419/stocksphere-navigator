import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { Machinery, MachineryType } from '@/lib/api';
import { cn } from '@/lib/utils';

// Mock data
const mockTypes: MachineryType[] = [
  { id: '1', name: 'Pumps', description: 'Hydraulic and mechanical pumps' },
  { id: '2', name: 'Conveyors', description: 'Belt and roller conveyors' },
  { id: '3', name: 'Motors', description: 'Electric and pneumatic motors' },
  { id: '4', name: 'Compressors', description: 'Air compressors' },
];

const mockMachinery: Machinery[] = [
  {
    id: '1',
    name: 'Hydraulic Pump A-12',
    code: 'HP-A12',
    type_id: '1',
    type: mockTypes[0],
    location: 'Production Hall A',
    status: 'operational',
    last_maintenance: '2024-01-10',
    next_maintenance: '2024-02-10',
  },
  {
    id: '2',
    name: 'Conveyor Belt CB-01',
    code: 'CB-01',
    type_id: '2',
    type: mockTypes[1],
    location: 'Assembly Line 1',
    status: 'maintenance',
    last_maintenance: '2024-01-05',
    next_maintenance: '2024-01-20',
  },
  {
    id: '3',
    name: 'Motor M-500',
    code: 'MTR-500',
    type_id: '3',
    type: mockTypes[2],
    location: 'Machine Room B',
    status: 'operational',
    last_maintenance: '2024-01-08',
    next_maintenance: '2024-02-08',
  },
  {
    id: '4',
    name: 'Air Compressor AC-200',
    code: 'AC-200',
    type_id: '4',
    type: mockTypes[3],
    location: 'Utility Room',
    status: 'out_of_service',
    last_maintenance: '2023-12-15',
    next_maintenance: '2024-01-15',
  },
  {
    id: '5',
    name: 'Pump Station P-02',
    code: 'PS-02',
    type_id: '1',
    type: mockTypes[0],
    location: 'Pump House',
    status: 'operational',
    last_maintenance: '2024-01-12',
    next_maintenance: '2024-02-12',
  },
];

const mockHistory = [
  { id: '1', machinery_id: '1', action: 'Routine Inspection', notes: 'All systems normal', performed_at: '2024-01-15T10:00:00Z', performed_by: 'John Doe' },
  { id: '2', machinery_id: '1', action: 'Oil Change', notes: 'Replaced hydraulic oil', performed_at: '2024-01-10T14:30:00Z', performed_by: 'Jane Smith' },
  { id: '3', machinery_id: '1', action: 'Filter Replacement', notes: 'Installed new filter element', performed_at: '2024-01-05T09:00:00Z', performed_by: 'Bob Wilson' },
  { id: '4', machinery_id: '1', action: 'Emergency Repair', notes: 'Fixed seal leak', performed_at: '2023-12-20T16:45:00Z', performed_by: 'John Doe' },
];

const MachineryPage = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machinery | null>(mockMachinery[0]);

  const filteredMachinery = mockMachinery.filter((machine) => {
    const matchesSearch =
      machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || machine.type_id === selectedType;

    return matchesSearch && matchesType;
  });

  const getStatusIcon = (status: Machinery['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-warning" />;
      case 'out_of_service':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Machinery</h1>
        <p className="mt-1 text-muted-foreground">
          Track and manage all machinery and equipment
        </p>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - List */}
        <div className="space-y-4 lg:col-span-1">
          {/* Filters */}
          <Card variant="glass">
            <CardContent className="space-y-3 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search machinery..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {mockTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Machine List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-1 p-2">
                  {filteredMachinery.map((machine) => (
                    <button
                      key={machine.id}
                      onClick={() => setSelectedMachine(machine)}
                      className={cn(
                        'w-full rounded-lg p-3 text-left transition-all',
                        selectedMachine?.id === machine.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(machine.status)}
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-foreground">{machine.name}</p>
                          <p className="text-xs text-muted-foreground">{machine.code}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={machine.status} className="text-xs">
                              {machine.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredMachinery.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <Wrench className="h-8 w-8" />
                      <p>No machinery found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Details */}
        <div className="space-y-4 lg:col-span-2">
          {selectedMachine ? (
            <>
              {/* Machine Details */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {selectedMachine.name}
                      <Badge variant={selectedMachine.status}>
                        {selectedMachine.status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {selectedMachine.code} • {selectedMachine.type?.name}
                    </CardDescription>
                  </div>
                  <Button variant="outline">
                    <Wrench className="mr-2 h-4 w-4" />
                    Schedule Maintenance
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1 rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs">Location</span>
                      </div>
                      <p className="font-medium">{selectedMachine.location}</p>
                    </div>
                    <div className="space-y-1 rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">Last Maintenance</span>
                      </div>
                      <p className="font-medium">{formatDate(selectedMachine.last_maintenance)}</p>
                    </div>
                    <div className="space-y-1 rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Next Maintenance</span>
                      </div>
                      <p className="font-medium">{formatDate(selectedMachine.next_maintenance)}</p>
                    </div>
                    <div className="space-y-1 rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wrench className="h-4 w-4" />
                        <span className="text-xs">Type</span>
                      </div>
                      <p className="font-medium">{selectedMachine.type?.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maintenance History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance History</CardTitle>
                  <CardDescription>Recent maintenance activities and records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-0">
                    {/* Timeline Line */}
                    <div className="absolute left-[17px] top-2 h-[calc(100%-16px)] w-0.5 bg-border" />
                    
                    {mockHistory.map((entry, index) => (
                      <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Timeline Dot */}
                        <div className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-card border-2 border-border">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 space-y-1 pt-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{entry.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(entry.performed_at)}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                          <p className="text-xs text-muted-foreground">
                            Performed by {entry.performed_by}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex h-96 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Wrench className="mx-auto h-12 w-12 mb-4" />
                <p>Select a machine to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachineryPage;
