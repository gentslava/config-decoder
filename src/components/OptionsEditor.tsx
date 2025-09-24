// src/components/OptionsEditor.tsx
import React from "react";
import {
  Paper,
  Stack,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Chip,
  Box,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import type { FieldLayout } from "../core/bitConfig";

interface FieldStatuses {
  [kindKey: string]: {
    unknown: boolean;
    conflictLocked: boolean;
    missing: boolean;
    partial: boolean;
  };
}

interface Props {
  layout: FieldLayout[];
  selections: Record<string, string>;
  setSelections: (next: Record<string, string>) => void;
  onReencode: (next: Record<string, string>) => void;
  locked: Record<string, boolean>;
  toggleLock: (kindKey: string) => void;
  fieldStatuses: FieldStatuses;
}

export const OptionsEditor: React.FC<Props> = ({
  layout,
  selections,
  setSelections,
  onReencode,
  locked,
  toggleLock,
  fieldStatuses,
}) => (
  <Stack spacing={2}>
    {layout.map((f) => {
      const options = Array.from(f.byKey.values());
      const current = selections[f.kindKey] ?? "";
      const isBinary = current && !f.byKey.has(current);
      const isLocked = !!locked[f.kindKey];
      const status = fieldStatuses[f.kindKey] || {
        unknown: false,
        conflictLocked: false,
        missing: false,
        partial: false,
      };

      // приоритет окраски рамки: missing > partial > conflict > unknown
      const borderColor = status.missing
        ? "error.main"
        : status.partial
        ? "warning.main"
        : status.conflictLocked
        ? "warning.main"
        : status.unknown
        ? "info.main"
        : "divider";

      return (
        <Paper
          key={f.kindKey}
          variant="outlined"
          sx={{ p: 2, opacity: isLocked ? 0.85 : 1, borderColor }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography fontWeight={600}>{f.nameEn}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {status.missing && (
                <Chip size="small" color="error" label="MISSING" />
              )}
              {status.partial && (
                <Chip size="small" color="warning" label="PARTIAL" />
              )}
              {status.unknown && (
                <Chip size="small" color="info" label="UNKNOWN" />
              )}
              {status.conflictLocked && (
                <Chip size="small" color="warning" label="LOCKED" />
              )}
              <Typography variant="caption" color="text.secondary">
                start {f.start} • len {f.length}
              </Typography>
              <IconButton
                size="small"
                onClick={() => toggleLock(f.kindKey)}
                title={isLocked ? "Разблокировать" : "Заблокировать"}
              >
                {isLocked ? (
                  <LockIcon fontSize="small" />
                ) : (
                  <LockOpenIcon fontSize="small" />
                )}
              </IconButton>
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Select
              displayEmpty
              size="small"
              sx={{ flex: 1, minWidth: 260 }}
              value={f.byKey.has(current) ? current : ""}
              onChange={(e) => {
                const next = {
                  ...selections,
                  [f.kindKey]: e.target.value as string,
                };
                setSelections(next);
                onReencode(next);
              }}
              disabled={isLocked}
            >
              <MenuItem value="">
                <em>— выбрать опцию —</em>
              </MenuItem>
              {options.map((opt) => (
                <MenuItem key={opt.key} value={opt.key}>
                  <Box>
                    <Typography variant="body2">
                      {opt.key} — {opt.nameEn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.value}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>

            <TextField
              size="small"
              label={`или вручную (${f.length} бит)`}
              value={isBinary ? current : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^01]/g, "");
                const next = { ...selections, [f.kindKey]: v.slice(-f.length) };
                setSelections(next);
                onReencode(next);
              }}
              InputProps={{
                sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
              }}
              disabled={isLocked}
            />
          </Stack>
        </Paper>
      );
    })}
    {layout.length === 0 && (
      <Typography color="text.secondary">Нет полей для выбора.</Typography>
    )}
  </Stack>
);
