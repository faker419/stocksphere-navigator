import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CategoryImportPreviewRow,
  commitCategoryImport,
  previewCategoryImport,
  listItemCategories,
  type ItemCategory,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UploadCloud } from "lucide-react";

const CategoryImportPage = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<CategoryImportPreviewRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [existingCategories, setExistingCategories] = useState<ItemCategory[]>([]);

  const hasErrors = previewRows.some((r) => r.status === "ERROR");
  const hasWarnings = previewRows.some((r) => r.status === "WARN");

  // Create lookup map for existing categories (normalized keys)
  const existingCategoriesByKey = useMemo(() => {
    const map = new Map<string, ItemCategory>();
    const normalizeKey = (name: string) =>
      name.trim().toLowerCase().replace(/\s+/g, " ");
    existingCategories.forEach((cat) => {
      const key = normalizeKey(cat.CategoryName);
      map.set(key, cat);
    });
    return map;
  }, [existingCategories]);

  // Load existing categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await listItemCategories(true, accessToken);
        setExistingCategories(cats);
      } catch {
        // Ignore errors, will validate on commit
      }
    };
    void loadCategories();
  }, [accessToken]);

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

  // Calculate category depth (0 = root, 1 = child, 2 = grandchild)
  const getCategoryDepth = (categoryId: number): number => {
    const category = existingCategories.find((c) => c.CategoryID === categoryId);
    if (!category || !category.ParentCategoryID) {
      return 0;
    }
    return getCategoryDepth(category.ParentCategoryID) + 1;
  };

  const recomputeRow = (
    rows: CategoryImportPreviewRow[],
    index: number,
  ): CategoryImportPreviewRow[] => {
    const copy = [...rows];
    const row = copy[index];
    if (!row || !row.raw) return rows;

    const name = normalizeDisplayName(row.raw.category_name || "");
    const parent = normalizeDisplayName(row.raw.parent_category || "");
    const desc = (row.raw.description || "").trim().replace(/\s+/g, " ");
    const activeRaw = (row.raw.is_active || "").trim();

    const normalizeKey = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, " ");

    // Start fresh with validation
    const issues: string[] = [];
    const notes: string[] = [];

    // Validate category name
    if (!name) {
      issues.push("Missing category_name");
    } else {
      const nameKey = normalizeKey(name);
      // Check for duplicates within the file
      const duplicateInFile = copy.some(
        (r, i) => i !== index && normalizeKey(r.raw.category_name || "") === nameKey
      );
      if (duplicateInFile) {
        issues.push("Duplicate category_name within file (case-insensitive)");
      }
      // Check if exists in database
      const existingCat = existingCategoriesByKey.get(nameKey);
      if (existingCat) {
        notes.push("Category already exists and will be updated on import");
      }
    }

    // Validate parent category
    if (parent) {
      const parentKey = normalizeKey(parent);
      const parentCat = existingCategoriesByKey.get(parentKey);
      if (!parentCat) {
        notes.push(
          `Parent category '${parent}' was not found and will be created as a root category`
        );
      } else {
        // Check if parent is at maximum depth (level 2 = third level)
        const parentDepth = getCategoryDepth(parentCat.CategoryID);
        if (parentDepth >= 2) {
          issues.push(
            `Parent category '${parent}' is at the maximum depth (level ${parentDepth + 1}) and cannot have children`
          );
        } else if (name) {
          const nameKey = normalizeKey(name);
          const existingCat = existingCategoriesByKey.get(nameKey);
          if (existingCat && parentCat.CategoryID === existingCat.CategoryID) {
            issues.push("Category cannot be its own parent");
          }
        }
      }
    }

    // Recompute status from the combined issues list
    const status =
      issues.length === 0
        ? "VALID"
        : issues.some(
            (m) =>
              m.startsWith("Missing") ||
              m.startsWith("Invalid") ||
              m.startsWith("Nesting") ||
              m.includes("maximum depth") ||
              m.includes("cannot be its own parent")
          )
        ? "ERROR"
        : "WARN";

    copy[index] = {
      ...row,
      raw: {
        category_name: name,
        parent_category: parent,
        description: desc,
        is_active: activeRaw,
      },
      status,
      issues,
      notes,
    };

    return copy;
  };

  const handlePreview = async () => {
    if (!importFile) {
      setImportError("Please select a CSV file first.");
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const result = await previewCategoryImport(importFile, accessToken);
      // Normalize names locally for UI (title case, spacing) while preserving server issues/notes
      const initial = result.rows ?? [];
      let normalized = initial;
      // Apply normalization to each row
      for (let i = 0; i < initial.length; i++) {
        normalized = recomputeRow(normalized, i);
      }
      setPreviewRows(normalized);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to preview import.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommit = async () => {
    if (previewRows.length === 0 || hasErrors || hasWarnings) {
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const result = await commitCategoryImport(previewRows, accessToken);
      if (result.failed_rows && result.failed_rows.length > 0) {
        // Update preview rows with errors from failed_rows
        setPreviewRows((current) => {
          const updated = current.map((row) => {
            // Find matching failed row by row_index
            const failedRow = result.failed_rows.find(
              (fr: any) => fr.row?.row_index === row.row_index
            );
            if (failedRow && failedRow.errors) {
              return {
                ...row,
                issues: [...(row.issues || []), ...failedRow.errors],
                status: "ERROR",
              };
            }
            return row;
          });
          return updated;
        });
        setImportError(
          `Imported with some failures: ${result.failed_rows.length} rows. Check the issues column for details.`,
        );
      } else {
        navigate("/items/categories");
      }
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to commit import.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/items/categories")}
            aria-label="Back to categories"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bulk import categories
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a CSV file to create or update item categories in bulk.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Prepare your data</CardTitle>
          <CardDescription>
            Start from the template so your columns match the expected format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="outline">
              <a
                href={`${API_BASE_URL}/api/v1/item-categories/import/template`}
                target="_blank"
                rel="noreferrer"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Download CSV template
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              Columns: <code>category_name</code>, <code>parent_category</code>,{" "}
              <code>description</code>, <code>is_active</code> (true/false).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload &amp; validate</CardTitle>
          <CardDescription>
            We&apos;ll check for missing data and invalid values before you
            import anything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="import_file">CSV file</Label>
              <Input
                id="import_file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImportFile(file);
                  setPreviewRows([]);
                  setImportError(null);
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={importLoading || !importFile}
            >
              {importLoading ? "Validating…" : "Validate file"}
            </Button>
          </div>

          {previewRows.length > 0 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">
                  3. Review preview ({previewRows.length} rows)
                </CardTitle>
                <CardDescription>
                  Fix rows with errors before importing. Warnings indicate rows
                  that may still be safe to import.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[420px] overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left">Row</th>
                        <th className="px-3 py-2 text-left">Category name</th>
                        <th className="px-3 py-2 text-left">Parent category</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Is active</th>
                        <th className="px-3 py-2 text-left">Issues / Notes</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr
                          key={row.row_index}
                          className={
                            row.status === "ERROR"
                              ? "bg-destructive/5"
                              : row.status === "WARN"
                              ? "bg-warning/5"
                              : ""
                          }
                        >
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {row.row_index}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.raw.category_name}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPreviewRows((current) => {
                                  const copy = [...current];
                                  copy[index] = {
                                    ...copy[index],
                                    raw: {
                                      ...copy[index].raw,
                                      category_name: value,
                                    },
                                  };
                                  return copy;
                                });
                              }}
                              onBlur={(e) => {
                                const formatted = normalizeDisplayName(e.target.value);
                                setPreviewRows((current) => {
                                  const updated = current.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          raw: {
                                            ...r.raw,
                                            category_name: formatted,
                                          },
                                        }
                                      : r,
                                  );
                                  return recomputeRow(updated, index);
                                });
                              }}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.raw.parent_category}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPreviewRows((current) => {
                                  const copy = [...current];
                                  copy[index] = {
                                    ...copy[index],
                                    raw: {
                                      ...copy[index].raw,
                                      parent_category: value,
                                    },
                                  };
                                  return copy;
                                });
                              }}
                              onBlur={(e) => {
                                const formatted = normalizeDisplayName(e.target.value);
                                setPreviewRows((current) => {
                                  const updated = current.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          raw: {
                                            ...r.raw,
                                            parent_category: formatted,
                                          },
                                        }
                                      : r,
                                  );
                                  return recomputeRow(updated, index);
                                });
                              }}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.raw.description}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPreviewRows((current) => {
                                  const copy = [...current];
                                  copy[index] = {
                                    ...copy[index],
                                    raw: {
                                      ...copy[index].raw,
                                      description: value,
                                    },
                                  };
                                  return copy;
                                });
                              }}
                              onBlur={() => {
                                setPreviewRows((current) =>
                                  recomputeRow(current, index),
                                );
                              }}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.raw.is_active}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPreviewRows((current) => {
                                  const copy = [...current];
                                  copy[index] = {
                                    ...copy[index],
                                    raw: {
                                      ...copy[index].raw,
                                      is_active: value,
                                    },
                                  };
                                  return copy;
                                });
                              }}
                              onBlur={() => {
                                setPreviewRows((current) =>
                                  recomputeRow(current, index),
                                );
                              }}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2 text-xs align-top">
                            {(() => {
                              const issues = row.issues ?? [];
                              const notes = row.notes ?? [];
                              const messages = [...issues, ...notes];
                              if (messages.length === 0) {
                                return (
                                  <span className="text-muted-foreground">
                                    No notes
                                  </span>
                                );
                              }
                              return (
                                <ul className="space-y-1">
                                  {messages.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={previewRows.length <= 1}
                              onClick={() => {
                                setPreviewRows((current) =>
                                  current.filter((_, i) => i !== index),
                                );
                              }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {hasErrors
                      ? "Fix rows with errors before importing."
                      : hasWarnings
                      ? "Some rows have warnings. Review them before importing."
                      : "All rows look good. You can proceed to import."}
                  </div>
                  <Button
                    onClick={handleCommit}
                    disabled={
                      importLoading ||
                      hasErrors ||
                      hasWarnings ||
                      previewRows.length === 0
                    }
                  >
                    {importLoading ? "Importing…" : "Import rows"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryImportPage;


