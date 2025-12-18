import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertTriangle, ArrowLeft, UploadCloud } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  API_BASE_URL,
  MachineryType,
  MachineryImportPreviewRow,
  previewMachineryImport,
  commitMachineryImport,
  listMachineryTypes,
} from "@/lib/api";

const MachineryImportPage = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [types, setTypes] = useState<MachineryType[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<MachineryImportPreviewRow[]>([]);
  const [existingMachineNames, setExistingMachineNames] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const hasErrors = previewRows.some((r) => r.status === "ERROR");
  const hasWarnings = previewRows.some((r) => r.status === "WARN");
  const STATUS_OPTIONS: Array<"OPERATIONAL" | "MAINTENANCE" | "OUT_OF_SERVICE"> = [
    "OPERATIONAL",
    "MAINTENANCE",
    "OUT_OF_SERVICE",
  ];

  // Load existing machinery types so we can tell if a type will be created or already exists
  useEffect(() => {
    let cancelled = false;
    const loadTypes = async () => {
      try {
        const data = await listMachineryTypes({}, accessToken);
        if (!cancelled) setTypes(data);
      } catch {
        if (!cancelled) setTypes([]);
      }
    };
    void loadTypes();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const normalizeKey = (value: string): string =>
    value.trim().toLowerCase();

  const existingTypeKeys = useMemo(
    () => new Set(types.map((t) => normalizeKey(t.TypeName))),
    [types],
  );

  const normalizeDisplayName = (value: string): string => {
    // Trim + collapse spaces, then title-case words
    const collapsed = value.trim().replace(/\s+/g, " ");
    if (!collapsed) return "";
    return collapsed
      .split(" ")
      .map((word) =>
        word.length === 0 ? "" : word[0].toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(" ");
  };

  const normalizeName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const recomputeRowValidation = (
    rows: MachineryImportPreviewRow[],
    index: number,
  ): MachineryImportPreviewRow[] => {
    const copy = [...rows];
    const row = copy[index];
    if (!row) return rows;

    const normAsset = row.raw.asset_tag.trim().toLowerCase();
    const normType = row.raw.machinery_type.trim().toLowerCase();
    const normName = row.raw.machine_name.trim().toLowerCase();
    const statusUpper = row.raw.status.toUpperCase();

    const issues: string[] = [];
    const notes: string[] = [];

    // Required fields
    if (!normAsset) issues.push("Missing asset_tag");
    if (!row.raw.machine_name.trim()) issues.push("Missing machine_name");
    if (!normType) issues.push("Missing machinery_type");

    // Duplicate asset_tag within the preview (case-insensitive)
    const duplicateInFile =
      !!normAsset &&
      copy.some(
        (other, otherIdx) =>
          otherIdx !== index &&
          other.raw.asset_tag.trim().toLowerCase() === normAsset,
      );
    if (duplicateInFile) {
      issues.push("Duplicate asset_tag within file (case-insensitive)");
    }

    // Duplicate machine_name checks (case-insensitive)
    if (normName) {
      // Check within the preview file
      const duplicateNameInFile = copy.some(
        (other, otherIdx) =>
          otherIdx !== index &&
          other.raw.machine_name.trim().toLowerCase() === normName,
      );
      if (duplicateNameInFile) {
        issues.push("Duplicate machine_name within file (case-insensitive)");
      }
      // Check against database (existingMachineNames are already normalized/lowercase)
      if (existingMachineNames.has(normName)) {
        issues.push("Machine name already exists in system (case-insensitive)");
      }
    }

    // Local knowledge of whether type already exists in backend types list
    const typeExists = !!normType && existingTypeKeys.has(normType);
    if (!typeExists && normType) {
      notes.push("Machinery type does not exist and will be created on import");
    }

    // Status validity
    if (!STATUS_OPTIONS.includes(statusUpper as any)) {
      issues.push(
        "Invalid status. Must be OPERATIONAL, MAINTENANCE, or OUT_OF_SERVICE",
      );
    }

    const rowStatus =
      issues.length === 0
        ? "VALID"
        : issues.some((msg) => msg.startsWith("Missing") || msg.startsWith("Invalid"))
        ? "ERROR"
        : "WARN";

    copy[index] = {
      ...row,
      raw: {
        ...row.raw,
        status: statusUpper,
      },
      normalized: {
        ...row.normalized,
        asset_tag: normAsset,
        machinery_type: normType,
      },
      status: rowStatus,
      issues,
      notes,
    };

    return copy;
  };

  const generateAssetTagForRow = (
    rows: MachineryImportPreviewRow[],
    index: number,
  ): MachineryImportPreviewRow[] => {
    const copy = [...rows];
    const row = copy[index];
    if (!row) return rows;

    const currentTag = row.raw.asset_tag.trim();
    const isAuto = row.auto_generated_asset_tag || !currentTag;
    const typeName = row.raw.machinery_type;
    if (!isAuto || !typeName.trim()) {
      return rows;
    }

    // Derive a simple type code from the machinery type name (matches backend logic)
    // Take first word, strip non-alphanumeric, remove trailing 'S' if present
    const cleaned = typeName.trim().toUpperCase();
    let code: string;
    if (!cleaned) {
      code = "MCH";
    } else {
      const firstWord = cleaned.split(/\s+/)[0];
      // Strip non-alphanumeric characters
      let letters = firstWord.split("").filter((ch) => /[A-Z0-9]/.test(ch)).join("");
      // Remove trailing 'S' if present and length > 1
      if (letters.endsWith("S") && letters.length > 1) {
        letters = letters.slice(0, -1);
      }
      code = letters || "MCH";
    }

    // Find the next available sequence within this preview batch
    const existingNumbers: number[] = [];
    for (const r of copy) {
      const tag = r.raw.asset_tag.trim().toUpperCase();
      if (tag.startsWith(code + "-")) {
        const suffix = tag.slice(code.length + 1);
        const num = parseInt(suffix, 10);
        if (!Number.isNaN(num)) {
          existingNumbers.push(num);
        }
      }
    }
    const nextNumber =
      existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1;
    const newTag = `${code}-${String(nextNumber).padStart(3, "0")}`;

    copy[index] = {
      ...row,
      raw: {
        ...row.raw,
        asset_tag: newTag,
      },
      auto_generated_asset_tag: true,
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
      const result = await previewMachineryImport(importFile, accessToken);
      setPreviewRows(result.rows);
      // Store existing machine names from DB for validation (already normalized/lowercase)
      setExistingMachineNames(new Set(result.existing_machine_names));
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to preview import."
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommit = async () => {
    if (previewRows.length === 0 || hasErrors) {
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const result = await commitMachineryImport(previewRows, accessToken);
      if (result.failed_rows && result.failed_rows.length > 0) {
        setImportError(
          `Some rows still failed validation. Please review them in the backend logs.`
        );
      } else {
        navigate("/machinery");
      }
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to commit import."
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
            onClick={() => navigate("/machinery")}
            aria-label="Back to machinery"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bulk import machinery
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a CSV file, validate rows, adjust values, then import.
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
                href={`${API_BASE_URL}/api/v1/machinery/import/template`}
                target="_blank"
                rel="noreferrer"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Download CSV template
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              Columns: <code>asset_tag</code>, <code>machine_name</code>,{" "}
              <code>machinery_type</code>, <code>location</code>,{" "}
              <code>status</code> (OPERATIONAL / MAINTENANCE / OUT_OF_SERVICE)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload &amp; validate</CardTitle>
          <CardDescription>
            We&apos;ll check for missing data, duplicates, and invalid values
            before you import anything.
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
                  setExistingMachineNames(new Set());
                  setImportError(null);
                }}
              />
            </div>
            <Button
              variant="default"
              onClick={handlePreview}
              disabled={importLoading || !importFile}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {importLoading ? "Validating…" : "Validate file"}
            </Button>
          </div>
          {importError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{importError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {previewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Review &amp; confirm</CardTitle>
            <CardDescription>
              Fix any rows with errors before importing. Status and notes are
              computed on the backend; status values must be one of the
              predefined options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-border rounded-md overflow-hidden">
              <div className="max-h-[480px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Row
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Asset tag
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Machine name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Machinery type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Location
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Notes
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
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
                            value={row.raw.asset_tag}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPreviewRows((current) => {
                                const copy = [...current];
                                copy[index] = {
                                  ...copy[index],
                                  raw: {
                                    ...copy[index].raw,
                                    asset_tag: value,
                                  },
                                  // If user types anything, stop treating this as auto-generated
                                  auto_generated_asset_tag: false,
                                };
                                return copy;
                              });
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              setPreviewRows((current) =>
                                recomputeRowValidation(current, index),
                              );
                            }}
                            className={`h-8 ${
                              row.auto_generated_asset_tag
                                ? "border-dashed border-warning bg-warning/5"
                                : ""
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={row.raw.machine_name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPreviewRows((current) => {
                                const copy = [...current];
                                copy[index] = {
                                  ...copy[index],
                                  raw: { ...copy[index].raw, machine_name: value },
                                };
                                return copy;
                              });
                            }}
                            onBlur={(e) => {
                              const formatted = normalizeDisplayName(e.target.value);
                              setPreviewRows((current) =>
                                recomputeRowValidation(
                                  current.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          raw: { ...r.raw, machine_name: formatted },
                                        }
                                      : r,
                                  ),
                                  index,
                                ),
                              );
                            }}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={row.raw.machinery_type}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPreviewRows((current) => {
                                const copy = [...current];
                                copy[index] = {
                                  ...copy[index],
                                  raw: { ...copy[index].raw, machinery_type: value },
                                };
                                return copy;
                              });
                            }}
                            onBlur={(e) => {
                              const formatted = normalizeDisplayName(e.target.value);
                              setPreviewRows((current) => {
                                const withType = current.map((r, i) =>
                                  i === index
                                    ? {
                                        ...r,
                                        raw: { ...r.raw, machinery_type: formatted },
                                      }
                                    : r,
                                );
                                const withTag = generateAssetTagForRow(withType, index);
                                return recomputeRowValidation(withTag, index);
                              });
                            }}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={row.raw.location}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPreviewRows((current) => {
                                const copy = [...current];
                                copy[index] = {
                                  ...copy[index],
                                  raw: { ...copy[index].raw, location: value },
                                };
                                return copy;
                              });
                            }}
                            onBlur={(e) => {
                              setPreviewRows((current) =>
                                recomputeRowValidation(
                                  current.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          raw: {
                                            ...r.raw,
                                            location: normalizeDisplayName(
                                              e.target.value,
                                            ),
                                          },
                                        }
                                      : r,
                                  ),
                                  index,
                                ),
                              );
                            }}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={
                              STATUS_OPTIONS.includes(
                                row.raw.status.toUpperCase() as any,
                              )
                                ? (row.raw.status.toUpperCase() as any)
                                : undefined
                            }
                            onValueChange={(value) => {
                              setPreviewRows((current) => {
                                return recomputeRowValidation(
                                  current.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          raw: { ...r.raw, status: value },
                                        }
                                      : r,
                                  ),
                                  index,
                                );
                              });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue
                                placeholder={
                                  STATUS_OPTIONS.includes(
                                    row.raw.status.toUpperCase() as any,
                                  )
                                    ? undefined
                                    : "Select status"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-xs">
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
                        <td className="px-3 py-2 text-xs">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={previewRows.length <= 1}
                            onClick={() => {
                              if (previewRows.length <= 1) return;
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewRows((current) => {
                      const nextIndex =
                        current.length > 0
                          ? Math.max(...current.map((r) => r.row_index)) + 1
                          : 1;
                      const newRow: MachineryImportPreviewRow = {
                        row_index: nextIndex,
                        raw: {
                          asset_tag: "",
                          machine_name: "",
                          machinery_type: "",
                          location: "",
                          status: "OPERATIONAL",
                        },
                        normalized: {
                          asset_tag: "",
                          machinery_type: "",
                        },
                        status: "ERROR",
                        issues: [
                          "Missing asset_tag",
                          "Missing machine_name",
                          "Missing machinery_type",
                        ],
                        resolved_type_id: null,
                      };
                      return [...current, newRow];
                    });
                  }}
                >
                  Add row
                </Button>
                <div className="text-xs text-muted-foreground">
                  {hasErrors
                    ? "Fix rows with errors before importing."
                    : hasWarnings
                    ? "Some rows have warnings. Review them before importing."
                    : "All rows look good. You can proceed to import."}
                </div>
              </div>
              <Button
                onClick={handleCommit}
                disabled={importLoading || hasErrors || hasWarnings || previewRows.length === 0}
              >
                {importLoading ? "Importing…" : "Import rows"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MachineryImportPage;


