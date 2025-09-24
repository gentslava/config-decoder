// src/components/OptionsEditor.tsx
import React, { memo, useMemo } from "react";
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
import { Virtuoso } from "react-virtuoso";

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

/** Одна «карточка» поля — мемоизирована для минимальных перерисовок */
const FieldCard: React.FC<{
  field: FieldLayout;
  value: string;
  selections: Record<string, string>;
  setSelections: Props["setSelections"];
  onReencode: Props["onReencode"];
  isLocked: boolean;
  toggleLock: Props["toggleLock"];
  status: FieldStatuses[string];
}> = memo(
  ({
    field: f,
    value,
    selections,
    setSelections,
    onReencode,
    isLocked,
    toggleLock,
    status,
  }) => {
    const options = useMemo(() => Array.from(f.byKey.values()), [f]);
    const isBinary = value && !f.byKey.has(value);

    // приоритет окраски рамки: missing > partial > conflict > unknown
    const borderColor = status?.missing
      ? "error.main"
      : status?.partial
      ? "warning.main"
      : status?.conflictLocked
      ? "warning.main"
      : status?.unknown
      ? "info.main"
      : "divider";

    const title = status?.missing
      ? "Поле полностью за пределами входной битстроки"
      : status?.partial
      ? "Поле покрыто входной битстрокой частично"
      : status?.conflictLocked
      ? "Изменение заблокировано"
      : status?.unknown
      ? "Неизвестный бинарный код (нет соответствия опциям)"
      : undefined;

    return (
      <Paper
        variant="outlined"
        sx={{ p: 2, borderColor, opacity: isLocked ? 0.85 : 1 }}
        title={title}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography fontWeight={600}>{f.nameEn}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {status?.missing && (
              <Chip size="small" color="error" label="MISSING" />
            )}
            {status?.partial && (
              <Chip size="small" color="warning" label="PARTIAL" />
            )}
            {status?.unknown && (
              <Chip size="small" color="info" label="UNKNOWN" />
            )}
            {status?.conflictLocked && (
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
            value={f.byKey.has(value) ? value : ""}
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
            value={isBinary ? value : ""}
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
  }
);
FieldCard.displayName = "FieldCard";

export const OptionsEditor: React.FC<Props> = ({
  layout,
  selections,
  setSelections,
  onReencode,
  locked,
  toggleLock,
  fieldStatuses,
}) => {
  // Небольшие списки рендерим без виртуализации — быстрее маунтится
  const VIRTUALIZE_AFTER = 20;
  if (layout.length <= VIRTUALIZE_AFTER) {
    return (
      <Stack spacing={2}>
        {layout.map((f) => (
          <FieldCard
            key={f.kindKey}
            field={f}
            value={selections[f.kindKey] ?? ""}
            selections={selections}
            setSelections={setSelections}
            onReencode={onReencode}
            isLocked={!!locked[f.kindKey]}
            toggleLock={toggleLock}
            status={
              fieldStatuses[f.kindKey] || {
                unknown: false,
                conflictLocked: false,
                missing: false,
                partial: false,
              }
            }
          />
        ))}
        {layout.length === 0 && (
          <Typography color="text.secondary">Нет полей для выбора.</Typography>
        )}
      </Stack>
    );
  }

  // Виртуализированный список (react-virtuoso)
  const ESTIMATED_ROW = 132; // ориентировочная высота карточки
  const VISIBLE_ROWS = 8;
  const height = Math.min(720, Math.max(ESTIMATED_ROW * VISIBLE_ROWS, 420));

  return (
    <Box>
      <Virtuoso
        style={{ height }}
        totalCount={layout.length}
        increaseViewportBy={{ top: 300, bottom: 600 }}
        itemContent={(index) => {
          const f = layout[index];
          return (
            <Box sx={{ mb: 2 }}>
              <FieldCard
                field={f}
                value={selections[f.kindKey] ?? ""}
                selections={selections}
                setSelections={setSelections}
                onReencode={onReencode}
                isLocked={!!locked[f.kindKey]}
                toggleLock={toggleLock}
                status={
                  fieldStatuses[f.kindKey] || {
                    unknown: false,
                    conflictLocked: false,
                    missing: false,
                    partial: false,
                  }
                }
              />
            </Box>
          );
        }}
      />
      {layout.length === 0 && (
        <Typography color="text.secondary">Нет полей для выбора.</Typography>
      )}
    </Box>
  );
};
