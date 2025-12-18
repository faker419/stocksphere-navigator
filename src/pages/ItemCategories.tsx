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
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listItemCategories,
  createItemCategory,
  updateItemCategory,
  deactivateItemCategory,
  type ItemCategory,
} from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";

const MAX_DEPTH = 2; // 0-based (0=root, 1=child, 2=grandchild) → 3 visible levels

const ItemCategoriesPage = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRootId, setExpandedRootId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const normalizeDisplayName = (value: string): string => {
    const collapsed = value.trim().replace(/\s+/g, " ");
    if (!collapsed) return "";
    return collapsed
      .split(" ")
      .map((word) =>
        word.length === 0 ? "" : word[0].toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(" ");
  };

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listItemCategories(true, accessToken);
      setCategories(data);
      if (data.length > 0 && selectedId == null) {
        setSelectedId(data[0].CategoryID);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const childrenByParentId = useMemo(() => {
    const map = new Map<number | null, ItemCategory[]>();
    for (const c of categories) {
      const key = c.ParentCategoryID ?? null;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    for (const [key, arr] of map) {
      arr.sort((a, b) => {
        if (a.DisplayOrder !== b.DisplayOrder) {
          return a.DisplayOrder - b.DisplayOrder;
        }
        return a.CategoryName.localeCompare(b.CategoryName);
      });
    }
    return map;
  }, [categories]);

  const flatCategories = useMemo(
    () => {
      const result: { cat: ItemCategory; depth: number }[] = [];
      const visit = (parent: number | null, depth: number) => {
        const children = childrenByParentId.get(parent) ?? [];
        for (const c of children) {
          result.push({ cat: c, depth });
          if (depth < MAX_DEPTH) {
            visit(c.CategoryID, depth + 1);
          }
        }
      };
      visit(null, 0);
      return result;
    },
    [childrenByParentId],
  );

  const depthById = useMemo(() => {
    const map = new Map<number, number>();
    for (const { cat, depth } of flatCategories) {
      map.set(cat.CategoryID, depth);
    }
    return map;
  }, [flatCategories]);

  const selectedCategory = categories.find((c) => c.CategoryID === selectedId) ?? null;
  const rootCategories = childrenByParentId.get(null) ?? [];

  const { siblings, siblingIndex } = useMemo(() => {
    if (!selectedCategory) {
      return { siblings: [] as ItemCategory[], siblingIndex: -1 };
    }
    const parentKey = selectedCategory.ParentCategoryID ?? null;
    const sibs = childrenByParentId.get(parentKey) ?? [];
    const idx = sibs.findIndex(
      (c) => c.CategoryID === selectedCategory.CategoryID,
    );
    return { siblings: sibs, siblingIndex: idx };
  }, [selectedCategory, childrenByParentId]);

  const canMoveUp = siblingIndex > 0;
  const canMoveDown =
    siblingIndex >= 0 && siblingIndex < siblings.length - 1;

  const getDescendantIds = (rootId: number): Set<number> => {
    const result = new Set<number>();
    const stack: number[] = [rootId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (result.has(current)) continue;
      result.add(current);
      const children = childrenByParentId.get(current) ?? [];
      for (const c of children) {
        stack.push(c.CategoryID);
      }
    }
    return result;
  };

  const invalidParentIds = useMemo(() => {
    if (!selectedCategory) return new Set<number>();
    const ids = getDescendantIds(selectedCategory.CategoryID);
    ids.add(selectedCategory.CategoryID);
    return ids;
  }, [selectedCategory, childrenByParentId]);

  // Recursive component to render nested parent category menu
  const renderParentCategoryMenu = (parentId: number | null) => {
    const children = (childrenByParentId.get(parentId) ?? []).filter(
      (cat) => {
        // Exclude invalid parents (self and descendants)
        if (invalidParentIds.has(cat.CategoryID)) return false;
        // Exclude categories at max depth
        const catDepth = depthById.get(cat.CategoryID) ?? 0;
        if (catDepth >= MAX_DEPTH) return false;
        return true;
      },
    );
    if (children.length === 0) return null;

    return children.map((category) => {
      const hasChildren =
        (childrenByParentId.get(category.CategoryID) ?? []).some(
          (c) => {
            if (invalidParentIds.has(c.CategoryID)) return false;
            const childDepth = depthById.get(c.CategoryID) ?? 0;
            return childDepth < MAX_DEPTH;
          },
        );
      const isSelected = parentId === category.CategoryID;

      if (hasChildren) {
        return (
          <DropdownMenuSub key={category.CategoryID}>
            <DropdownMenuSubTrigger>
              <span className="flex-1">{category.CategoryName}</span>
              {isSelected && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => setParentId(category.CategoryID)}
              >
                <span className="flex-1">{category.CategoryName}</span>
                {isSelected && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
              {renderParentCategoryMenu(category.CategoryID)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }

      return (
        <DropdownMenuItem
          key={category.CategoryID}
          onClick={() => setParentId(category.CategoryID)}
        >
          <span className="flex-1">{category.CategoryName}</span>
          {isSelected && <Check className="ml-2 h-4 w-4" />}
        </DropdownMenuItem>
      );
    });
  };

  const resetFormFor = (cat: ItemCategory | null, asChild = false) => {
    if (cat) {
      setName(cat.CategoryName);
      setDescription(cat.Description ?? "");
      setParentId(asChild ? cat.CategoryID : cat.ParentCategoryID ?? null);
    } else {
      setName("");
      setDescription("");
      setParentId(null);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedId(id);
    const cat = categories.find((c) => c.CategoryID === id) ?? null;
    resetFormFor(cat, false);
  };

  const handleMove = async (direction: "up" | "down") => {
    if (!selectedCategory) return;
    if (siblings.length === 0 || siblingIndex < 0) return;

    const targetIndex = direction === "up" ? siblingIndex - 1 : siblingIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const current = siblings[siblingIndex];
    const target = siblings[targetIndex];

    const currentOrder = current.DisplayOrder ?? 0;
    const targetOrder = target.DisplayOrder ?? 0;

    setSaving(true);
    try {
      await updateItemCategory(
        current.CategoryID,
        { display_order: targetOrder },
        accessToken,
      );
      await updateItemCategory(
        target.CategoryID,
        { display_order: currentOrder },
        accessToken,
      );
      await loadCategories();
    } catch (e: any) {
      setError(e?.message ?? "Failed to reorder category");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoot = () => {
    setSelectedId(null);
    resetFormFor(null, false);
  };

  const handleAddChild = () => {
    if (!selectedCategory) return;
    const depth = depthById.get(selectedCategory.CategoryID) ?? 0;
    if (depth >= MAX_DEPTH) return;
    setSelectedId(null);
    resetFormFor(selectedCategory, true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (selectedCategory) {
        // Updating existing category
        const depthOfNewParent =
          parentId == null ? -1 : depthById.get(parentId) ?? -1;
        if (depthOfNewParent >= MAX_DEPTH) {
          throw new Error("Cannot nest deeper than 3 levels.");
        }
        await updateItemCategory(
          selectedCategory.CategoryID,
          {
            category_name: name.trim(),
            description: description || null,
            parent_category_id: parentId,
          },
          accessToken,
        );
      } else {
        // Creating new category
        const depthOfNewParent =
          parentId == null ? -1 : depthById.get(parentId) ?? -1;
        if (depthOfNewParent >= MAX_DEPTH) {
          throw new Error("Cannot nest deeper than 3 levels.");
        }

        // Auto-assign display order as last among siblings
        const sibs = childrenByParentId.get(parentId ?? null) ?? [];
        const finalDisplayOrder =
          sibs.length === 0
            ? 0
            : Math.max(...sibs.map((s) => s.DisplayOrder ?? 0)) + 1;

        const created = await createItemCategory(
          {
            category_name: name.trim(),
            description: description || null,
            parent_category_id: parentId,
            display_order: finalDisplayOrder,
            is_active: true,
          },
          accessToken,
        );
        setSelectedId(created.CategoryID);
      }
      await loadCategories();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedCategory) return;
    if (
      !window.confirm(
        `Deactivate category "${selectedCategory.CategoryName}"? Items keep this category but it will be hidden as active.`,
      )
    ) {
      return;
    }
    try {
      await deactivateItemCategory(selectedCategory.CategoryID, accessToken);
      await loadCategories();
    } catch (e: any) {
      setError(e?.message ?? "Failed to deactivate category");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/items")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Categories</h1>
            <p className="text-sm text-muted-foreground">
              Define and organize item categories (up to 3 levels of nesting).
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/items/categories/import")}
            className="gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button variant="outline" onClick={handleAddRoot} className="gap-2">
            <Plus className="h-4 w-4" />
            New Root Category
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid h-full gap-4 md:grid-cols-[minmax(260px,320px)_1fr]">
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {loading && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    Loading...
                  </p>
                )}
                {!loading && rootCategories.length === 0 && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    No categories yet. Create your first one on the right.
                  </p>
                )}
                {!loading &&
                  rootCategories.map((root) => {
                    const isExpanded = expandedRootId === root.CategoryID;
                    const hasChildren =
                      (childrenByParentId.get(root.CategoryID) ?? []).length > 0;

                    const renderSubtree = (
                      parentId: number,
                      depth: number,
                    ): JSX.Element[] => {
                      const children = childrenByParentId.get(parentId) ?? [];
                      return children.flatMap((child) => {
                        const childHasChildren =
                          (childrenByParentId.get(child.CategoryID) ?? []).length >
                          0;
                        const node = (
                          <button
                            key={child.CategoryID}
                            type="button"
                            onClick={() => handleSelect(child.CategoryID)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2 py-1 text-sm",
                              selectedId === child.CategoryID
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted",
                            )}
                            style={{ paddingLeft: 8 + depth * 12 }}
                          >
                            <span className="flex items-center gap-1">
                              {childHasChildren && (
                                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                              )}
                              <span className="truncate">{child.CategoryName}</span>
                            </span>
                            {!child.IsActive && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px]"
                              >
                                Inactive
                              </Badge>
                            )}
                          </button>
                        );

                        const descendants = renderSubtree(child.CategoryID, depth + 1);
                        return [node, ...descendants];
                      });
                    };

                    return (
                      <div key={root.CategoryID} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedRootId((prev) =>
                              prev === root.CategoryID ? null : root.CategoryID,
                            );
                            handleSelect(root.CategoryID);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1 text-sm",
                            selectedId === root.CategoryID
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {hasChildren ? (
                              isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )
                            ) : (
                              <span className="h-3 w-3" />
                            )}
                            <span className="truncate">{root.CategoryName}</span>
                          </span>
                          {!root.IsActive && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </button>
                        {isExpanded && hasChildren && (
                          <div className="pl-4">
                            {renderSubtree(root.CategoryID, 1)}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedCategory ? "Edit Category" : "Create Category"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => {
                  const formatted = normalizeDisplayName(e.target.value);
                  setName(formatted);
                }}
                placeholder="e.g. Spare Parts"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={(e) => {
                  const formatted = e.target.value.trim().replace(/\s+/g, " ");
                  setDescription(formatted);
                }}
                placeholder="Optional description"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Parent category (optional)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {parentId != null
                        ? categories.find((c) => c.CategoryID === parentId)
                            ?.CategoryName ?? "Select parent"
                        : "No parent"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px]" align="start">
                    <DropdownMenuItem onClick={() => setParentId(null)}>
                      <span className="flex-1">No parent</span>
                      {parentId == null && <Check className="ml-2 h-4 w-4" />}
                    </DropdownMenuItem>
                    {renderParentCategoryMenu(null)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-[11px] text-muted-foreground">
                  Nesting is limited to 3 levels (root → child → grandchild).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Order among siblings</Label>
                {selectedCategory ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Position{" "}
                      {siblingIndex >= 0
                        ? `${siblingIndex + 1} of ${siblings.length}`
                        : "n/a"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={!canMoveUp || saving}
                        onClick={() => void handleMove("up")}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={!canMoveDown || saving}
                        onClick={() => void handleMove("down")}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Order is set automatically when creating a new category.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Use the arrows to move this category up or down within the same
                  parent.
                </p>
              </div>
            </div>

            {selectedCategory && (
              <div className="space-y-2">
                <Label>Children</Label>
                <div className="flex flex-wrap gap-2">
                  {(childrenByParentId.get(selectedCategory.CategoryID) ??
                    []
                  ).map((child) => (
                    <Badge key={child.CategoryID} variant="secondary">
                      {child.CategoryName}
                    </Badge>
                  ))}
                  {(childrenByParentId.get(selectedCategory.CategoryID) ??
                    []
                  ).length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No direct children.
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1"
                  onClick={handleAddChild}
                  disabled={
                    (depthById.get(selectedCategory.CategoryID ?? 0) ?? 0) >=
                    MAX_DEPTH
                  }
                >
                  <Plus className="h-3 w-3" />
                  Add Child Category
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {selectedCategory && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleDeactivate()}
                  disabled={saving || !selectedCategory.IsActive}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Deactivate
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => resetFormFor(selectedCategory, false)}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ItemCategoriesPage;


