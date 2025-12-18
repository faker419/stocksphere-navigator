import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ActivityLog,
  type ActivityLogFilters,
  type ActivityLogCleanupRequest,
  listActivityLogs,
  getActivityLog,
  cleanupActivityLogs,
  listUsers,
  type User,
} from "@/lib/api";
import { AlertTriangle, Filter, RefreshCcw, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_OPTIONS = ["CREATE", "UPDATE", "DELETE", "VIEW", "BULK_CREATE"];
const RESOURCE_TYPE_OPTIONS = [
  "User",
  "Item",
  "Machinery",
  "Request",
  "Store",
  "Role",
  "Privilege",
  "Stock",
  "ActivityLog",
];

const ActivityLogsPage = () => {
  const { accessToken } = useAuth();

  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    page_size: 50,
  });
  const [data, setData] = useState<{
    items: ActivityLog[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupPayload, setCleanupPayload] = useState<ActivityLogCleanupRequest>({
    older_than_days: 365,
    resource_type: undefined,
    action_type: undefined,
    dry_run: true,
  });
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const hasFilters = useMemo(
    () =>
      !!(
        filters.user_id ||
        filters.resource_type ||
        filters.action_type ||
        filters.resource_id ||
        filters.start_date ||
        filters.end_date ||
        filters.status_code ||
        filters.has_error !== undefined
      ),
    [filters]
  );

  const loadLogs = async (override?: Partial<ActivityLogFilters>) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const nextFilters: ActivityLogFilters = {
        ...filters,
        ...override,
      };
      const result = await listActivityLogs(nextFilters, accessToken);
      setFilters(nextFilters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!accessToken) return;
      setUsersLoading(true);
      try {
        const result = await listUsers({}, accessToken);
        setUsers(result);
      } catch {
        // silently ignore user list failures for now
      } finally {
        setUsersLoading(false);
      }
    };
    void loadUsers();
  }, [accessToken]);

  const handleOpenDetail = async (logId: number) => {
    if (!accessToken) return;
    try {
      const log = await getActivityLog(logId, accessToken);
      setSelectedLog(log);
      setDetailOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load log details.");
    }
  };

  const handleCleanup = async () => {
    if (!accessToken) return;
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const res = await cleanupActivityLogs(cleanupPayload, accessToken);
      setCleanupResult(res.message);
      // If not dry-run, refresh list
      if (!res.dry_run) {
        void loadLogs();
      }
    } catch (err) {
      setCleanupResult(
        err instanceof Error ? err.message : "Failed to clean up activity logs."
      );
    } finally {
      setCleanupLoading(false);
    }
  };

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString();
  };

  const currentPage = data?.page ?? 1;
  const totalPages = data?.total_pages ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="mt-1 text-muted-foreground">
            System-wide audit trail of user actions and system changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({ page: 1, page_size: 50 });
              void loadLogs({ page: 1, user_id: undefined, resource_type: undefined, action_type: undefined, resource_id: undefined, start_date: undefined, end_date: undefined, status_code: undefined, has_error: undefined });
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCleanupDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clean up
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="user_id">User</Label>
              <Select
                value={filters.user_id !== undefined ? String(filters.user_id) : "any"}
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    user_id: val === "any" ? undefined : Number(val),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger id="user_id">
                  <SelectValue placeholder={usersLoading ? "Loading users…" : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name || u.username} (ID: {u.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="resource_type">Resource type</Label>
              <Select
                value={filters.resource_type ?? "any"}
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    resource_type: val === "any" ? undefined : val,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger id="resource_type">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All</SelectItem>
                  {RESOURCE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="action_type">Action</Label>
              <Select
                value={filters.action_type ?? "any"}
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    action_type: val === "any" ? undefined : val,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger id="action_type">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="resource_id">Resource ID</Label>
              <Input
                id="resource_id"
                type="number"
                value={filters.resource_id ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    resource_id: e.target.value ? Number(e.target.value) : undefined,
                    page: 1,
                  }))
                }
                placeholder="Any"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    start_date: e.target.value || undefined,
                    page: 1,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_date">End date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    end_date: e.target.value || undefined,
                    page: 1,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="status_code">Status code</Label>
              <Input
                id="status_code"
                type="number"
                value={filters.status_code ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status_code: e.target.value ? Number(e.target.value) : undefined,
                    page: 1,
                  }))
                }
                placeholder="Any"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="has_error">Errors</Label>
              <Select
                value={
                  filters.has_error === undefined
                    ? "any"
                    : filters.has_error
                    ? "true"
                    : "false"
                }
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    has_error:
                      val === "any"
                        ? undefined
                        : val === "true"
                        ? true
                        : false,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger id="has_error">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="true">Only errors</SelectItem>
                  <SelectItem value="false">Only success</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="h-3 w-3" />
              <span>{hasFilters ? "Filters applied" : "No filters applied"}</span>
            </div>
            <Button
              size="sm"
              onClick={() => loadLogs({ page: 1 })}
              disabled={loading}
            >
              {loading ? "Loading…" : "Apply filters"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Activity log entries</span>
            <span className="text-xs font-normal text-muted-foreground">
              {data ? `${data.total} entries` : "—"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="flex items-center gap-2 border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <ScrollArea className="h-[calc(100vh-340px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                      No activity logs found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((log) => (
                    <TableRow
                      key={log.ActivityLogID}
                      className={cn(
                        "cursor-pointer",
                        log.ErrorMessage && "bg-destructive/5"
                      )}
                      onClick={() => handleOpenDetail(log.ActivityLogID)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(log.CreatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {log.user_full_name || log.user_username || "System"}
                          </span>
                          {log.UserID && (
                            <span className="text-xs text-muted-foreground">
                              ID: {log.UserID}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            log.ActionType === "CREATE" && "bg-emerald-100 text-emerald-800",
                            log.ActionType === "UPDATE" && "bg-blue-100 text-blue-800",
                            log.ActionType === "DELETE" && "bg-red-100 text-red-800",
                            log.ActionType === "VIEW" && "bg-slate-100 text-slate-800",
                            log.ActionType === "BULK_CREATE" &&
                              "bg-purple-100 text-purple-800"
                          )}
                        >
                          {log.ActionType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{log.ResourceType}</span>
                          {log.ResourceIdentifier && (
                            <span className="text-xs text-muted-foreground">
                              {log.ResourceIdentifier}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {log.RequestMethod} {log.RequestPath}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              log.StatusCode && log.StatusCode >= 400
                                ? "text-destructive"
                                : "text-emerald-600"
                            )}
                          >
                            {log.StatusCode ?? "—"}
                          </span>
                          {log.ErrorMessage && (
                            <span className="text-[11px] text-destructive">
                              {log.ErrorMessage}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableCaption>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => loadLogs({ page: currentPage - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !totalPages || currentPage >= totalPages || loading
                      }
                      onClick={() => loadLogs({ page: currentPage + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </TableCaption>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Activity details</DialogTitle>
          </DialogHeader>
          {selectedLog ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Timestamp
                  </p>
                  <p>{formatDateTime(selectedLog.CreatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    User
                  </p>
                  <p>
                    {selectedLog.user_full_name ||
                      selectedLog.user_username ||
                      "System"}
                    {selectedLog.UserID && ` (ID: ${selectedLog.UserID})`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Action
                  </p>
                  <p>{selectedLog.ActionType}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Resource
                  </p>
                  <p>
                    {selectedLog.ResourceType}
                    {selectedLog.ResourceIdentifier &&
                      ` • ${selectedLog.ResourceIdentifier}`}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Request
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLog.RequestMethod} {selectedLog.RequestPath}
                  </p>
                </div>
              </div>

              {selectedLog.Metadata && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Metadata
                  </p>
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedLog.Metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.ErrorMessage && (
                <div className="rounded-md bg-destructive/5 p-3 text-xs text-destructive">
                  <p className="font-semibold">Error</p>
                  <p>{selectedLog.ErrorMessage}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Cleanup dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clean up activity logs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Remove old activity log entries to keep the database small. Start with a dry
              run to see how many rows would be removed.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="older_than_days">Older than (days)</Label>
                <Input
                  id="older_than_days"
                  type="number"
                  min={1}
                  value={cleanupPayload.older_than_days}
                  onChange={(e) =>
                    setCleanupPayload((prev) => ({
                      ...prev,
                      older_than_days: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cleanup_action_type">Action type (optional)</Label>
                <Select
                  value={cleanupPayload.action_type ?? "any"}
                  onValueChange={(val) =>
                    setCleanupPayload((prev) => ({
                      ...prev,
                      action_type: val === "any" ? undefined : val,
                    }))
                  }
                >
                  <SelectTrigger id="cleanup_action_type">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {ACTION_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cleanup_resource_type">Resource type (optional)</Label>
                <Select
                  value={cleanupPayload.resource_type ?? "any"}
                  onValueChange={(val) =>
                    setCleanupPayload((prev) => ({
                      ...prev,
                      resource_type: val === "any" ? undefined : val,
                    }))
                  }
                >
                  <SelectTrigger id="cleanup_resource_type">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All</SelectItem>
                    {RESOURCE_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cleanup_mode">Mode</Label>
                <Select
                  value={cleanupPayload.dry_run ? "dry" : "delete"}
                  onValueChange={(val) =>
                    setCleanupPayload((prev) => ({
                      ...prev,
                      dry_run: val === "dry",
                    }))
                  }
                >
                  <SelectTrigger id="cleanup_mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dry">Dry run (preview only)</SelectItem>
                    <SelectItem value="delete">Delete now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>
                  Deleting logs is irreversible. Use dry run first to see impact.
                </span>
              </div>
              <Button
                variant={cleanupPayload.dry_run ? "outline" : "destructive"}
                size="sm"
                onClick={handleCleanup}
                disabled={cleanupLoading}
              >
                {cleanupLoading
                  ? "Running…"
                  : cleanupPayload.dry_run
                  ? "Run dry run"
                  : "Delete logs"}
              </Button>
            </div>

            {cleanupResult && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {cleanupResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogsPage;


