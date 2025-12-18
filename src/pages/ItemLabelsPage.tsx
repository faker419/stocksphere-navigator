import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Palette, Tag, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listLabels,
  createLabel,
  updateLabel,
  deactivateLabel,
  type LabelDto,
  type CreateLabelRequest,
  type UpdateLabelRequest,
} from "@/lib/api";

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

const ItemLabelsPage = () => {
  const navigate = useNavigate();
  const { accessToken, hasPrivilege } = useAuth();

  const [labels, setLabels] = useState<LabelDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingLabel, setEditingLabel] = useState<LabelDto | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState<string | "">("");
  const [labelGroup, setLabelGroup] = useState<string | "">("");
  const [labelDescription, setLabelDescription] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [groupComboboxOpen, setGroupComboboxOpen] = useState(false);

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

  const loadLabels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLabels(true, accessToken);
      setLabels(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load labels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelsByGroup = useMemo(() => {
    const grouped = new Map<string | null, LabelDto[]>();
    for (const label of labels) {
      const group = label.LabelGroup || null;
      const arr = grouped.get(group) ?? [];
      arr.push(label);
      grouped.set(group, arr);
    }
    for (const [key, arr] of grouped) {
      arr.sort((a, b) => a.LabelName.localeCompare(b.LabelName));
      grouped.set(key, arr);
    }
    return grouped;
  }, [labels]);

  const existingGroups = useMemo(
    () =>
      Array.from(
        new Set(
          labels
            .map((l) => l.LabelGroup)
            .filter((g): g is string => !!g && g.trim().length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [labels],
  );

  const openCreateLabel = () => {
    setEditingLabel(null);
    setLabelName("");
    setLabelColor("");
    setLabelGroup("");
    setLabelDescription("");
    setLabelError(null);
    setGroupComboboxOpen(false);
  };

  const openEditLabel = (label: LabelDto) => {
    setEditingLabel(label);
    setLabelName(label.LabelName);
    setLabelColor(label.LabelColor ?? "");
    setLabelGroup(label.LabelGroup ?? "");
    setLabelDescription(label.Description ?? "");
    setLabelError(null);
    setGroupComboboxOpen(false);
  };

  const handleSaveLabel = async () => {
    if (!labelName.trim()) {
      setLabelError("Label name is required.");
      return;
    }
    setLabelSaving(true);
    try {
      const payload: CreateLabelRequest | UpdateLabelRequest = {
        label_name: normalizeDisplayName(labelName),
        label_color: labelColor || null,
        label_group: labelGroup ? normalizeDisplayName(labelGroup) : null,
        description: labelDescription || null,
      };

      if (editingLabel) {
        await updateLabel(editingLabel.LabelID, payload, accessToken);
      } else {
        await createLabel(payload as CreateLabelRequest, accessToken);
      }

      await loadLabels();
      setEditingLabel(null);
      setLabelName("");
      setLabelColor("");
      setLabelGroup("");
      setLabelDescription("");
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
      await loadLabels();
    } catch (e: any) {
      setLabelError(e?.message ?? "Failed to deactivate label");
    }
  };

  const handleBack = () => {
    navigate("/items");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Labels & Tags</h1>
            <p className="mt-1 text-muted-foreground">
              Organize labels into groups (e.g. shelf locations under &quot;Location&quot;).
            </p>
          </div>
        </div>
        {canManageItems && (
          <Button onClick={openCreateLabel} className="gap-2">
            <Palette className="h-4 w-4" />
            New Label
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Groups & labels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[540px] pr-4">
              <div className="space-y-4">
                {Array.from(labelsByGroup.entries())
                  .sort(([a], [b]) => {
                    if (a === null) return 1;
                    if (b === null) return -1;
                    return a.localeCompare(b);
                  })
                  .map(([group, groupLabels]) => (
                    <Card key={group ?? "ungrouped"} className="border-dashed">
                      <CardHeader className="py-3">
                        <CardTitle className="flex items-center justify-between text-sm font-semibold">
                          <span>{group ?? "Ungrouped"}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {groupLabels.length} label{groupLabels.length === 1 ? "" : "s"}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="flex flex-wrap gap-2">
                          {groupLabels.map((l) => (
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
                          {groupLabels.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              No labels in this group yet.
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {labels.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No labels defined yet. Use the form on the right to create your first label.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {editingLabel ? "Edit label" : "Create label"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labelError && <p className="text-sm text-destructive">{labelError}</p>}
              <div className="space-y-2">
                <UILabel>Name</UILabel>
                <Input
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  onBlur={(e) => setLabelName(normalizeDisplayName(e.target.value))}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <UILabel>Color</UILabel>
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
                  <UILabel>Preview</UILabel>
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
                <UILabel>Group</UILabel>
                <Popover open={groupComboboxOpen} onOpenChange={setGroupComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={groupComboboxOpen}
                      className="w-full justify-between"
                    >
                      {labelGroup || "Select or create group..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search groups or type to create..."
                        value={labelGroup}
                        onValueChange={(value) => setLabelGroup(value)}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {labelGroup.trim() ? (
                            <div className="py-2">
                              <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => {
                                  const normalized = normalizeDisplayName(labelGroup);
                                  setLabelGroup(normalized);
                                  setGroupComboboxOpen(false);
                                }}
                              >
                                <Tag className="mr-2 h-4 w-4" />
                                Create &quot;{normalizeDisplayName(labelGroup)}&quot;
                              </Button>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No groups found. Start typing to create one.
                            </div>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {existingGroups
                            .filter((group) =>
                              group.toLowerCase().includes(labelGroup.toLowerCase()),
                            )
                            .map((group) => (
                              <CommandItem
                                key={group}
                                value={group}
                                onSelect={() => {
                                  setLabelGroup(group);
                                  setGroupComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    labelGroup === group ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {group}
                              </CommandItem>
                            ))}
                          {labelGroup.trim() &&
                            !existingGroups
                              .map((g) => g.toLowerCase())
                              .includes(labelGroup.toLowerCase()) && (
                              <CommandItem
                                value={labelGroup}
                                onSelect={() => {
                                  const normalized = normalizeDisplayName(labelGroup);
                                  setLabelGroup(normalized);
                                  setGroupComboboxOpen(false);
                                }}
                              >
                                <Tag className="mr-2 h-4 w-4" />
                                Create &quot;{normalizeDisplayName(labelGroup)}&quot;
                              </CommandItem>
                            )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Select an existing group or type to create a new one.
                </p>
              </div>
              <div className="space-y-2">
                <UILabel>Description</UILabel>
                <Input
                  value={labelDescription}
                  onChange={(e) => setLabelDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={openCreateLabel}
                  disabled={labelSaving}
                >
                  Reset
                </Button>
                <Button type="button" onClick={() => void handleSaveLabel()} disabled={labelSaving}>
                  {labelSaving ? "Saving..." : "Save Label"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ItemLabelsPage;


