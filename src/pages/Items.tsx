import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  listItemsWithFilters,
  listItemCategories,
  listLabels,
  setItemLabels,
  getItemLabels,
  createLabel,
  updateLabel,
  deactivateLabel,
  type BackendItem,
  type ItemCategory,
  type LabelDto,
  createItem,
  updateItem,
  deleteItem,
} from "@/lib/api";
import {
  Plus,
  Search,
  Tag,
  Package,
  Layers,
  Palette,
  Pencil,
  Trash2,
} from "lucide-react";

const ItemsPage = () => {
  const { accessToken, hasPrivilege } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<BackendItem[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [labels, setLabels] = useState<LabelDto[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [labelFilter, setLabelFilter] = useState<number | "all">("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BackendItem | null>(null);
  const [form, setForm] = useState<any>({
    sku: "",
    item_name: "",
    description: "",
    unit_of_measure: "",
    is_spare_part: false,
    is_active: true,
    category_id: null,
  });
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [isLabelsDialogOpen, setIsLabelsDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelDto | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState<string | "">("");
  const [labelGroup, setLabelGroup] = useState<string | "">("");
  const [labelDescription, setLabelDescription] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  const canManageItems = hasPrivilege("can_manage_items");

  const labelTextColor = (hex?: string | null): string => {
    if (!hex) return "#000000";
    const value = hex.replace("#", "");
    if (value.length !== 6) return "#000000";
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? "#000000" : "#ffffff";
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, lbls, rawItems] = await Promise.all([
        listItemCategories(true, accessToken),
        listLabels(false, accessToken),
        listItemsWithFilters(
          {
            search: search || undefined,
            label_id: labelFilter !== "all" ? Number(labelFilter) : undefined,
            is_active: true,
          },
          accessToken,
        ),
      ]);
      setCategories(cats);
      setLabels(lbls);
      setItems(rawItems);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, labelFilter]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(),
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of categories) {
      map.set(c.CategoryID, c.CategoryName);
    }
    return map;
  }, [categories]);

  // Group labels by LabelGroup
  const labelsByGroup = useMemo(() => {
    const grouped = new Map<string | null, LabelDto[]>();
    for (const label of labels) {
      const group = label.LabelGroup || null;
      const arr = grouped.get(group) ?? [];
      arr.push(label);
      grouped.set(group, arr);
    }
    // Sort labels within each group by name
    for (const [group, arr] of grouped) {
      arr.sort((a, b) => a.LabelName.localeCompare(b.LabelName));
    }
    return grouped;
  }, [labels]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<number | null, ItemCategory[]>();
    for (const cat of categories) {
      const parentId = cat.ParentCategoryID ?? null;
      const arr = map.get(parentId) ?? [];
      arr.push(cat);
      map.set(parentId, arr);
    }
    // sort children by DisplayOrder, then name
    for (const [key, arr] of map) {
      arr.sort((a, b) => {
        if (a.DisplayOrder !== b.DisplayOrder) {
          return a.DisplayOrder - b.DisplayOrder;
        }
        return a.CategoryName.localeCompare(b.CategoryName);
      });
      map.set(key, arr);
    }
    return map;
  }, [categories]);

  const flatCategoriesWithDepth = useMemo(
    () => {
      const result: { cat: ItemCategory; depth: number }[] = [];
      const visit = (parentId: number | null, depth: number) => {
        const children = childrenByParentId.get(parentId) ?? [];
        for (const child of children) {
          result.push({ cat: child, depth });
          visit(child.CategoryID, depth + 1);
        }
      };
      visit(null, 0);
      return result;
    },
    [childrenByParentId],
  );

  // Recursive component to render nested category menu for filtering
  const renderCategoryMenu = (parentId: number | null) => {
    const children = (childrenByParentId.get(parentId) ?? []).filter(
      (cat) => cat.IsActive,
    );
    if (children.length === 0) return null;

    return children.map((category) => {
      const hasChildren =
        (childrenByParentId.get(category.CategoryID) ?? []).filter(
          (c) => c.IsActive,
        ).length > 0;
      const isSelected = categoryFilter === category.CategoryID;

      if (hasChildren) {
        return (
          <DropdownMenuSub key={category.CategoryID}>
            <DropdownMenuSubTrigger className="group">
              <span className="flex-1">{category.CategoryName}</span>
              {isSelected && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => setCategoryFilter(category.CategoryID)}
              >
                <span className="flex-1">All {category.CategoryName}</span>
                {isSelected && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              {renderCategoryMenu(category.CategoryID)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }

      return (
        <DropdownMenuItem
          key={category.CategoryID}
          onClick={() => setCategoryFilter(category.CategoryID)}
        >
          <span className="flex-1">{category.CategoryName}</span>
          {isSelected && <Check className="ml-2 h-4 w-4" />}
        </DropdownMenuItem>
      );
    });
  };

  // Recursive component to render nested category menu for form selection
  const renderCategorySelectMenu = (
    parentId: number | null,
    selectedId: number | null,
    onSelect: (categoryId: number | null) => void,
  ) => {
    const children = (childrenByParentId.get(parentId) ?? []).filter(
      (cat) => cat.IsActive,
    );
    if (children.length === 0) return null;

    return children.map((category) => {
      const hasChildren =
        (childrenByParentId.get(category.CategoryID) ?? []).filter(
          (c) => c.IsActive,
        ).length > 0;
      const isSelected = selectedId === category.CategoryID;

      if (hasChildren) {
        return (
          <DropdownMenuSub key={category.CategoryID}>
            <DropdownMenuSubTrigger>
              <span className="flex-1">{category.CategoryName}</span>
              {isSelected && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => onSelect(category.CategoryID)}
              >
                <span className="flex-1">{category.CategoryName}</span>
                {isSelected && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              {renderCategorySelectMenu(
                category.CategoryID,
                selectedId,
                onSelect,
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }

      return (
        <DropdownMenuItem
          key={category.CategoryID}
          onClick={() => onSelect(category.CategoryID)}
        >
          <span className="flex-1">{category.CategoryName}</span>
          {isSelected && <Check className="ml-2 h-4 w-4" />}
        </DropdownMenuItem>
      );
    });
  };

  const visibleItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    // Filter by matching category or descendants
    const ids = new Set<number>();
    const root = Number(categoryFilter);
    ids.add(root);
    const queue = [root];
    while (queue.length) {
      const current = queue.shift()!;
      const children = childrenByParentId.get(current) ?? [];
      for (const c of children) {
        if (!ids.has(c.CategoryID)) {
          ids.add(c.CategoryID);
          queue.push(c.CategoryID);
        }
      }
    }
    return items.filter(
      (item) => item.CategoryID != null && ids.has(item.CategoryID),
    );
  }, [items, categoryFilter, childrenByParentId]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({
      sku: "",
      item_name: "",
      description: "",
      unit_of_measure: "",
      is_spare_part: false,
      is_active: true,
      category_id: null,
    });
    setSelectedLabelIds([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = async (item: BackendItem) => {
    setEditingItem(item);
    setForm({
      sku: item.SKU,
      item_name: item.ItemName,
      description: item.Description ?? "",
      unit_of_measure: item.UnitOfMeasure,
      is_spare_part: item.IsSparePart,
      is_active: item.IsActive,
      category_id: item.CategoryID ?? null,
    });
    try {
      const currentLabels = await getItemLabels(item.ItemID, accessToken);
      setSelectedLabelIds(currentLabels.map((l) => l.LabelID));
    } catch {
      setSelectedLabelIds([]);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        const updateBody: any = {
          item_name: form.item_name,
          description: form.description,
          unit_of_measure: form.unit_of_measure,
          is_spare_part: form.is_spare_part,
          is_active: form.is_active,
          category_id: form.category_id ?? null,
        };
        await updateItem(editingItem.ItemID, updateBody, accessToken);
        await setItemLabels(editingItem.ItemID, selectedLabelIds, accessToken);
      } else {
        const created = await createItem(form, accessToken);
        await setItemLabels(created.id, selectedLabelIds, accessToken);
      }
      setIsDialogOpen(false);
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: BackendItem) => {
    if (!window.confirm(`Delete item ${item.ItemName}?`)) return;
    try {
      await deleteItem(item.ItemID, accessToken);
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete item");
    }
  };

  const toggleLabel = (id: number) => {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openLabelsDialog = () => {
    setEditingLabel(null);
    setLabelName("");
    setLabelColor("");
    setLabelGroup("");
    setLabelDescription("");
    setLabelError(null);
    setIsLabelsDialogOpen(true);
  };

  const openEditLabel = (label: LabelDto) => {
    setEditingLabel(label);
    setLabelName(label.LabelName);
    setLabelColor(label.LabelColor ?? "");
    setLabelGroup(label.LabelGroup ?? "");
    setLabelDescription(label.Description ?? "");
    setLabelError(null);
    setIsLabelsDialogOpen(true);
  };

  const handleSaveLabel = async () => {
    if (!labelName.trim()) {
      setLabelError("Label name is required.");
      return;
    }
    setLabelSaving(true);
    try {
      if (editingLabel) {
        await updateLabel(
          editingLabel.LabelID,
          {
            label_name: labelName.trim(),
            label_color: labelColor || null,
            label_group: labelGroup.trim() || null,
            description: labelDescription || null,
          },
          accessToken,
        );
      } else {
        await createLabel(
          {
            label_name: labelName.trim(),
            label_color: labelColor || null,
            label_group: labelGroup.trim() || null,
            description: labelDescription || null,
          },
          accessToken,
        );
      }
      setIsLabelsDialogOpen(false);
      await loadData();
    } catch (e: any) {
      setLabelError(e?.message ?? "Failed to save label");
    } finally {
      setLabelSaving(false);
    }
  };

  const handleDeactivateLabel = async (label: LabelDto) => {
    if (!window.confirm(`Deactivate label "${label.LabelName}"?`)) return;
    try {
      await deactivateLabel(label.LabelID, accessToken);
      await loadData();
    } catch (e: any) {
      setLabelError(e?.message ?? "Failed to deactivate label");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Items</h1>
          <p className="mt-1 text-muted-foreground">
            Master list of items and spare parts, with categories and tags.
          </p>
        </div>
        <div className="flex gap-2">
          {canManageItems && (
            <>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                New Item
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/items/categories")}
              >
                <Layers className="h-4 w-4" />
                Manage Categories
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/items/labels")}
              >
                <Palette className="h-4 w-4" />
                Manage Labels
              </Button>
            </>
          )}
        </div>
      </div>

      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[200px] justify-start"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  {categoryFilter === "all"
                    ? "All Categories"
                    : categoryNameById.get(Number(categoryFilter)) ?? "Category"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]" align="start">
                <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                  <span className="flex-1">All Categories</span>
                  {categoryFilter === "all" && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </DropdownMenuItem>
                {renderCategoryMenu(null)}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[220px] justify-start"
                >
                  <Tag className="mr-2 h-4 w-4" />
                  {labelFilter === "all"
                    ? "All Labels"
                    : labels.find((l) => l.LabelID === labelFilter)?.LabelName ??
                      "Filter by label"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[220px]" align="start">
                <DropdownMenuItem onClick={() => setLabelFilter("all")}>
                  <span className="flex-1">All Labels</span>
                  {labelFilter === "all" && <Check className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                {Array.from(labelsByGroup.entries())
                  .sort(([a], [b]) => {
                    if (a === null) return 1;
                    if (b === null) return -1;
                    return a.localeCompare(b);
                  })
                  .map(([group, groupLabels]) => {
                    if (group === null) {
                      return groupLabels.map((l) => (
                        <DropdownMenuItem
                          key={l.LabelID}
                          onClick={() => setLabelFilter(l.LabelID)}
                        >
                          <span className="flex-1">{l.LabelName}</span>
                          {labelFilter === l.LabelID && (
                            <Check className="ml-2 h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                      ));
                    }
                    return (
                      <DropdownMenuSub key={group}>
                        <DropdownMenuSubTrigger>
                          <span className="flex-1">{group}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {groupLabels.map((l) => (
                            <DropdownMenuItem
                              key={l.LabelID}
                              onClick={() => setLabelFilter(l.LabelID)}
                            >
                              <span className="flex-1">{l.LabelName}</span>
                              {labelFilter === l.LabelID && (
                                <Check className="ml-2 h-4 w-4" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="px-4 pt-2 text-sm text-destructive">{error}</p>
          )}
          <ScrollArea className="max-h-[calc(100vh-280px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Labels</TableHead>
                  {canManageItems && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading &&
                  visibleItems.map((item) => {
                    const categoryName =
                      (item.CategoryID &&
                        categoryNameById.get(item.CategoryID)) ||
                      "—";
                    const typeBadge = item.IsSparePart ? "Spare Part" : "Generic";
                    return (
                      <TableRow key={item.ItemID} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {item.SKU}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">
                          {item.ItemName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{categoryName}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.IsSparePart ? "outline" : "secondary"}
                          >
                            {typeBadge}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.IsActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="text-xs text-muted-foreground">
                            {/* Could show summarized labels later */}
                            —
                          </span>
                        </TableCell>
                        {canManageItems && (
                          <TableCell className="whitespace-nowrap text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void openEditDialog(item)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => void handleDelete(item)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-sm">
                      Loading items...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-sm">
                      No items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit item" : "Create item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.item_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, item_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit_of_measure}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      unit_of_measure: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {form.category_id != null
                        ? categoryNameById.get(form.category_id) ?? "Select category"
                        : "No category"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px]" align="start">
                    <DropdownMenuItem
                      onClick={() =>
                        setForm((f) => ({ ...f, category_id: null }))
                      }
                    >
                      <span className="flex-1">No category</span>
                      {form.category_id == null && (
                        <Check className="ml-2 h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                    {renderCategorySelectMenu(
                      null,
                      form.category_id,
                      (categoryId) =>
                        setForm((f) => ({ ...f, category_id: categoryId })),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.is_spare_part ? "spare" : "generic"}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      is_spare_part: val === "spare",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Generic</SelectItem>
                    <SelectItem value="spare">Spare Part</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Labels / Tags (incl. Shelf tags)</Label>
              <ScrollArea className="max-h-[300px] rounded-md border p-4">
                <div className="space-y-3">
                  {Array.from(labelsByGroup.entries())
                    .sort(([a], [b]) => {
                      if (a === null) return 1;
                      if (b === null) return -1;
                      return a.localeCompare(b);
                    })
                    .map(([group, groupLabels]) => {
                      // Count selected labels in this group
                      const selectedCount = groupLabels.filter((l) =>
                        selectedLabelIds.includes(l.LabelID),
                      ).length;

                      if (group === null) {
                        return (
                          <div key="ungrouped" className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Ungrouped</span>
                              {selectedCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {selectedCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {groupLabels.map((l) => {
                                const active = selectedLabelIds.includes(
                                  l.LabelID,
                                );
                                return (
                                  <button
                                    key={l.LabelID}
                                    type="button"
                                    onClick={() => toggleLabel(l.LabelID)}
                                    className={cn(
                                      "relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
                                      active
                                        ? "border-white ring-2 ring-white/30 shadow-sm"
                                        : "border-border hover:border-white/60 opacity-60",
                                    )}
                                    style={{
                                      backgroundColor: l.LabelColor || undefined,
                                      color: labelTextColor(l.LabelColor),
                                    }}
                                  >
                                    {active && (
                                      <Check className="h-3 w-3 shrink-0" />
                                    )}
                                    {l.LabelName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      const isOpen = expandedGroups.has(group);
                      return (
                        <Collapsible
                          key={group}
                          open={isOpen}
                          onOpenChange={(open) => {
                            setExpandedGroups((prev) => {
                              const next = new Set(prev);
                              if (open) {
                                next.add(group);
                              } else {
                                next.delete(group);
                              }
                              return next;
                            });
                          }}
                        >
                          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent">
                            <div className="flex items-center gap-2">
                              <span>{group}</span>
                              {selectedCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {selectedCount}
                                </Badge>
                              )}
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2 pl-2">
                              {groupLabels.map((l) => {
                                const active = selectedLabelIds.includes(
                                  l.LabelID,
                                );
                                return (
                                  <button
                                    key={l.LabelID}
                                    type="button"
                                    onClick={() => toggleLabel(l.LabelID)}
                                    className={cn(
                                      "relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
                                      active
                                        ? "border-white ring-2 ring-white/30 shadow-sm"
                                        : "border-border hover:border-white/60 opacity-60",
                                    )}
                                    style={{
                                      backgroundColor: l.LabelColor || undefined,
                                      color: labelTextColor(l.LabelColor),
                                    }}
                                  >
                                    {active && (
                                      <Check className="h-3 w-3 shrink-0" />
                                    )}
                                    {l.LabelName}
                                  </button>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  {labels.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No labels defined yet. Create them using the "Manage
                      Labels" button.
                    </span>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLabelsDialogOpen} onOpenChange={setIsLabelsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? "Edit label" : "Create label"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {labelError && (
              <p className="text-sm text-destructive">{labelError}</p>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={labelColor || "#888888"}
                    onChange={(e) => setLabelColor(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded-md border border-border bg-background p-1"
                  />
                  <Input
                    value={labelColor}
                    placeholder="#RRGGBB"
                    onChange={(e) => setLabelColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preview</Label>
                <div
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs"
                  style={{
                    backgroundColor: labelColor || "#e5e7eb",
                    color: labelTextColor(labelColor || "#e5e7eb"),
                  }}
                >
                  <Tag className="mr-1 h-3 w-3" />
                  {labelName || "Label"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Group (optional)</Label>
              <Input
                value={labelGroup}
                onChange={(e) => setLabelGroup(e.target.value)}
                placeholder="e.g., Location, Condition, Ownership"
              />
              <p className="text-xs text-muted-foreground">
                Group labels together (e.g., all shelf locations under "Location")
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={labelDescription}
                onChange={(e) => setLabelDescription(e.target.value)}
              />
            </div>

            {labels.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label>Existing labels</Label>
                <div className="flex flex-wrap gap-2">
                  {labels.map((l) => (
                    <div
                      key={l.LabelID}
                      className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
                    >
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: l.LabelColor || "#e5e7eb",
                          color: labelTextColor(l.LabelColor || "#e5e7eb"),
                        }}
                      >
                        {l.LabelName}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditLabel(l)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      {l.IsActive && (
                        <button
                          type="button"
                          onClick={() => void handleDeactivateLabel(l)}
                          className="ml-1 text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLabelsDialogOpen(false)}
              disabled={labelSaving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveLabel()} disabled={labelSaving}>
              {labelSaving ? "Saving..." : "Save Label"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ItemsPage;


