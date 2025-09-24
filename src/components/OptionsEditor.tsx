// src/components/OptionsEditor.tsx
import React, { memo, useMemo, useState } from "react";
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
  Button,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import SearchIcon from "@mui/icons-material/Search";
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

/** Карточка одного поля — мемоизирована */
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
  const SMALL_LIST_THRESHOLD = 20;
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return layout;
    return layout.filter(
      (f) =>
        f.nameEn.toLowerCase().includes(s) ||
        (f.halKey || "").toLowerCase().includes(s)
    );
  }, [layout, q]);

  const useVirtual = filtered.length > SMALL_LIST_THRESHOLD;

  // индикаторы списка
  const [first, setFirst] = useState(0);
  const [last, setLast] = useState(Math.min(filtered.length, 1));
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const ESTIMATED_ROW = 132;
  const baseHeight = Math.min(720, Math.max(ESTIMATED_ROW * 8, 420));
  const height = expanded
    ? Math.min(900, Math.max(ESTIMATED_ROW * 12, baseHeight))
    : baseHeight;

  const Header = (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1, gap: 1 }}
      >
        <Typography variant="subtitle2">
          {q
            ? `Результаты: ${filtered.length} из ${layout.length}`
            : `Поля ${filtered.length}`}
          {useVirtual &&
            filtered.length > 0 &&
            ` • видимые ${first + 1}–${Math.max(first + 1, last)}`}
        </Typography>
        <Stack direction="row" spacing={1}>
          {useVirtual && (
            <Tooltip title={expanded ? "Свернуть список" : "Развернуть список"}>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  expanded ? <CloseFullscreenIcon /> : <OpenInFullIcon />
                }
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Свернуть" : "Развернуть"}
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <TextField
        size="small"
        placeholder="Поиск по имени или HAL…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
    </Stack>
  );

  if (!useVirtual) {
    return (
      <Stack spacing={2}>
        {Header}
        {filtered.map((f) => (
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
        {filtered.length === 0 && (
          <Typography color="text.secondary">Ничего не найдено.</Typography>
        )}
      </Stack>
    );
  }

  return (
    <Box>
      {Header}

      <Box
        sx={{
          position: "relative",
          borderRadius: 2,
          overflow: "hidden",
          mt: 1,
        }}
      >
        <Virtuoso
          style={{ height }}
          totalCount={filtered.length}
          increaseViewportBy={{ top: 300, bottom: 600 }}
          itemContent={(index) => {
            const f = filtered[index];
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
          rangeChanged={(r) => {
            setFirst(r.startIndex);
            setLast(r.endIndex);
          }}
          atTopStateChange={setAtTop}
          atBottomStateChange={setAtBottom}
        />

        {!atTop && (
          <Box
            sx={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 48,
              background: (t) =>
                `linear-gradient(${t.palette.background.paper}, rgba(0,0,0,0))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ opacity: 0.7 }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
              <Typography variant="caption">Прокрутите вверх</Typography>
            </Stack>
          </Box>
        )}
        {!atBottom && (
          <Box
            sx={{
              pointerEvents: "none",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 56,
              background: (t) =>
                `linear-gradient(rgba(0,0,0,0), ${t.palette.background.paper})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ opacity: 0.7 }}
            >
              <Typography variant="caption">Прокрутите вниз</Typography>
              <KeyboardArrowDownIcon fontSize="small" />
            </Stack>
          </Box>
        )}
      </Box>

      {filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Ничего не найдено.
        </Typography>
      )}
    </Box>
  );
};
