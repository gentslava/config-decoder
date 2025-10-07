// src/components/Composer.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  TextField,
  IconButton,
  Alert,
  Tooltip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DescriptionIcon from "@mui/icons-material/Description";

import {
  BitConfigCore,
  FieldLayout,
  OverlayConflict,
  PadDirection,
  TrimDirection,
} from "../core/bitConfig";

import { OptionsEditor } from "./OptionsEditor";
import { BitsEditor } from "./BitsEditor";
import { ComparePanel } from "./ComparePanel";

type Props = {
  layout: FieldLayout[];
  width: number;
  /** Текущий HEX наверх (для мобильной док-панели) */
  onHexSnapshot?: (hex: string) => void;
  hexInput: string;
  setHexInput: (v: string) => void;
  notify: (toast: string) => void;
};

export const Composer: React.FC<Props> = ({
  layout,
  width,
  onHexSnapshot,
  hexInput,
  setHexInput,
  notify,
}) => {
  // ------- состояние -------
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [bitString, setBitString] = useState("");
  const [baseBits, setBaseBits] = useState("");
  const [rawBits, setRawBits] = useState("");
  const [mode, setMode] = useState<"options" | "bits" | "hex" | "diff">("options");

  // Синхронизация hexInput -> bitString
  useEffect(() => {
    if (!hexInput) {
      setBitString("");
      return;
    }
    try {
      setFromHex(hexInput);
    } catch {
      // Некорректный HEX — не обновляем bitString
    }
  }, [hexInput]);

  // Политика нормализации/обрезки (включает 'none')
  const [padDirection, setPadDirection] = useState<PadDirection>("none");
  const [trimDirection, setTrimDirection] = useState<TrimDirection>("none");

  // Блокировки
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const toggleLock = (kindKey: string) =>
    setLocked((m) => ({ ...m, [kindKey]: !m[kindKey] }));

  // Конфликты и статусы
  const [conflicts, setConflicts] = useState<OverlayConflict[]>([]);
  const [fieldStatuses, setFieldStatuses] = useState<
    Record<
      string,
      {
        unknown: boolean;
        conflictLocked: boolean;
        missing: boolean;
        partial: boolean;
      }
    >
  >({});
  const [tailBits, setTailBits] = useState(""); // хвост сверх width
  const [shortDelta, setShortDelta] = useState(0); // недостающие биты до width при "не дополнять"

  // Сброс при смене ширины (новый конфиг)
  useEffect(() => {
    const zeros = "0".repeat(width || 0);
    setBaseBits(zeros);
    setBitString(zeros);
    setSelections({});
    setHexInput("");
    setRawBits("");
    setLocked({});
    setConflicts([]);
    setFieldStatuses({});
    setTailBits("");
    setShortDelta(0);
  }, [width]);

  const copy = (t: string, label = "Скопировано") => {
    navigator.clipboard?.writeText(String(t));
    notify(label);
  };

  // Пересчет статусов по покрытию (для MISSING/PARTIAL/UNKNOWN)
  const recomputeStatuses = useCallback(
    (frameBits: string, fullInputBits: string) => {
      const decoded = BitConfigCore.decodeBits(layout, frameBits);
      const cov = BitConfigCore.coverageForLayout(layout, fullInputBits.length);
      const statuses: Record<
        string,
        {
          unknown: boolean;
          conflictLocked: boolean;
          missing: boolean;
          partial: boolean;
        }
      > = {};
      for (const f of layout) {
        const d = decoded.byKindKey[f.kindKey];
        const c = cov.find((x) => x.kindKey === f.kindKey)!;
        statuses[f.kindKey] = {
          unknown: !c.full ? false : !d?.option, // UNKNOWN только когда поле полностью покрыто входом
          conflictLocked: false,
          missing: c.missing,
          partial: c.partial,
        };
      }
      setFieldStatuses(statuses);
    },
    [layout]
  );

  // Обновление из выбора опций: накладываем на кадр и синхронизируем selections
  const reencodeFromSelections = (sel: Record<string, string>) => {
    const { bitString: outBits, conflicts: c } =
      BitConfigCore.overlaySelections(layout, baseBits, sel, locked);
    setBaseBits(outBits);
    setConflicts(c);

    // Обновляем «Текущий результат»
    let nextResultBits: string;
    if (padDirection === "none" || trimDirection === "none") {
      const L = Math.min(bitString.length, width);
      nextResultBits =
        L > 0 ? outBits.slice(0, L) + bitString.slice(L) : bitString;
      setBitString(nextResultBits);
    } else {
      nextResultBits = outBits;
      setBitString(nextResultBits);
      setTailBits("");
      setShortDelta(0);
    }

    const decoded = BitConfigCore.decodeBits(layout, outBits);
    const nextSel: Record<string, string> = {};
    for (const f of layout) {
      const d = decoded.byKindKey[f.kindKey];
      nextSel[f.kindKey] = d?.option ? d.option.key : d?.binary;
    }
    setSelections(nextSel);
    recomputeStatuses(outBits, nextResultBits);
  };

  // Применение произвольных BIT
  const applyBits = () => {
    const raw = rawBits.replace(/[^01]/g, "");
    if (padDirection === "none" || trimDirection === "none") {
      setBitString(raw);
      const nextBase = BitConfigCore.overlayIntoFrame(baseBits, raw, width);
      setBaseBits(nextBase);
      setTailBits(raw.length > width ? raw.slice(width) : "");
      setShortDelta(raw.length < width ? width - raw.length : 0);

      const decoded = BitConfigCore.decodeBits(layout, nextBase);
      const next: Record<string, string> = {};
      for (const f of layout) {
        const d = decoded.byKindKey[f.kindKey];
        next[f.kindKey] = d?.option ? d.option.key : d?.binary;
      }
      setSelections(next);
      setConflicts([]);
      recomputeStatuses(nextBase, raw);
      notify("Биты применены");
      return;
    }

    const normalized = BitConfigCore.normalizeBitsToWidth(
      raw,
      width,
      padDirection,
      trimDirection
    );
    setBitString(normalized);
    setTailBits("");
    setShortDelta(0);
    setBaseBits(normalized);

    const decoded = BitConfigCore.decodeBits(layout, normalized);
    const next: Record<string, string> = {};
    for (const f of layout) {
      const d = decoded.byKindKey[f.kindKey];
      next[f.kindKey] = d?.option ? d.option.key : d?.binary;
    }
    setSelections(next);
    setConflicts([]);
    recomputeStatuses(normalized, normalized);
    notify("Биты применены");
  };

  // Применение HEX
  const setFromHex = (hex: string) => {
    try {
      const bytes = BitConfigCore.hexToBytes(hex);
      const raw = BitConfigCore.bytesToBitString(bytes);

      if (padDirection === "none" || trimDirection === "none") {
        setBitString(raw);
        const nextBase = BitConfigCore.overlayIntoFrame(baseBits, raw, width);
        setBaseBits(nextBase);
        setTailBits(raw.length > width ? raw.slice(width) : "");
        setShortDelta(raw.length < width ? width - raw.length : 0);

        const decoded = BitConfigCore.decodeBits(layout, nextBase);
        const next: Record<string, string> = {};
        for (const f of layout) {
          const d = decoded.byKindKey[f.kindKey];
          next[f.kindKey] = d?.option ? d.option.key : d?.binary;
        }
        setSelections(next);
        setConflicts([]);
        recomputeStatuses(nextBase, raw);
        return;
      }

      const normalized = BitConfigCore.normalizeBitsToWidth(
        raw,
        width,
        padDirection,
        trimDirection
      );
      setBitString(normalized);
      setTailBits("");
      setShortDelta(0);
      setBaseBits(normalized);

      const decoded = BitConfigCore.decodeBits(layout, normalized);
      const next: Record<string, string> = {};
      for (const f of layout) {
        const d = decoded.byKindKey[f.kindKey];
        next[f.kindKey] = d?.option ? d.option.key : d?.binary;
      }
      setSelections(next);
      setConflicts([]);
      recomputeStatuses(normalized, normalized);
    } catch (e: any) {}
  };

  // Вычисления представлений
  const bigIntDisplay = useMemo(
    () =>
      bitString
        ? "0b" +
          BigInt("0b" + BitConfigCore.padBitsRightToByte(bitString)).toString(2)
        : "",
    [bitString]
  );
  const hexDisplay = useMemo(
    () =>
      bitString
        ? BitConfigCore.bytesToHex(BitConfigCore.bitStringToBytes(bitString))
        : "",
    [bitString]
  );

  // Снапшот HEX наверх для мобильной док-панели
  useEffect(() => {
    if (onHexSnapshot) onHexSnapshot(hexDisplay);
  }, [hexDisplay, onHexSnapshot]);

  // Обработчики Select с типами (чтобы состояние не «сужалось»)
  const onPadDirChange = (e: SelectChangeEvent<PadDirection>) =>
    setPadDirection(e.target.value as PadDirection);
  const onTrimDirChange = (e: SelectChangeEvent<TrimDirection>) =>
    setTrimDirection(e.target.value as TrimDirection);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      {/* Заголовок + табы */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        sx={{ mb: 2, gap: 1 }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: 18, md: 20 } }}>
          Компоновка конфигурации
        </Typography>

        <Tabs
          value={mode}
          onChange={(_, v) => setMode(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}
        >
          <Tab value="options" label="Опции" />
          <Tab value="bits" label="Биты" />
          <Tab value="hex" label="HEX" />
          <Tab value="diff" label="Сравнение" />
        </Tabs>
      </Stack>

      <Stack
        direction="column"
        justifyContent="space-between"
        alignItems={{ md: "start" }}
        sx={{ mb: 2, gap: 1 }}
      >
        <Typography variant="caption" color="text.secondary">
          Новая конфигурация – переключите опции ниже для изменения: {hexDisplay}
        </Typography>
        <Button startIcon={<ContentCopyIcon />} onClick={() => copy(hexDisplay)}>
          Копировать текущий HEX
        </Button>
      </Stack>

      {/* Контент вкладок */}
      {mode === "options" && (
        <OptionsEditor
          layout={layout}
          selections={selections}
          setSelections={setSelections}
          onReencode={reencodeFromSelections}
          locked={locked}
          toggleLock={toggleLock}
          fieldStatuses={fieldStatuses}
        />
      )}

      {mode === "bits" && (
        <BitsEditor
          width={width}
          rawBits={rawBits}
          setRawBits={setRawBits}
          applyBits={() => {
            applyBits();
          }}
          onApplied={() => notify("Биты применены")}
        />
      )}

      {mode === "diff" && (
        <ComparePanel
          layout={layout}
          width={width}
          padDirection={padDirection}
          trimDirection={trimDirection}
          currentBits={bitString}
        />
      )}

      {/* Подсказки режима "не дополнять/не обрезать" */}
      {(padDirection === "none" || trimDirection === "none") &&
        mode !== "diff" && (
          <>
            {shortDelta > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Входная битстрока короче ширины кадра на <b>{shortDelta}</b>{" "}
                бит. Поля вне входа отмечены как <b>MISSING</b> или{" "}
                <b>PARTIAL</b>.
              </Alert>
            )}
            {tailBits && tailBits.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Вход длиннее на <b>{tailBits.length}</b> бит. Хвост сохранён и
                помечен как <b>неизвестные функции</b>.
              </Alert>
            )}
          </>
        )}

      {/* Хвост «неизвестные функции» */}
      {tailBits && tailBits.length > 0 && mode !== "diff" && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 1.5, md: 2 }, mt: 2, borderColor: "info.main" }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Хвост (неизвестные функции)
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Tail (BITS)"
            value={tailBits}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
            }}
          />
          <TextField
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            label="Tail (HEX)"
            value={BitConfigCore.bytesToHex(
              BitConfigCore.bitStringToBytes(tailBits)
            )}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
            }}
          />
        </Paper>
      )}

      <Divider sx={{ my: 2, display: mode !== "diff" ? "block" : "none" }} />

      {/* Конфликты блокировок */}
      {conflicts.length > 0 && mode !== "diff" && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 1.5, md: 2 }, mb: 2, borderColor: "warning.main" }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Конфликты
          </Typography>
          {conflicts.map((c, idx) => (
            <Typography key={idx} variant="body2" color="warning.main">
              Поле "
              {layout.find((f) => f.kindKey === c.kindKey)?.nameEn || c.kindKey}
              ": попытка изменить, но поле заблокировано.
            </Typography>
          ))}
        </Paper>
      )}

      {/* Итоги / копирование */}
      {mode !== "diff" && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Текущий результат</Typography>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ md: "center" }}
          >
            <TextField
              fullWidth
              size="small"
              label="BIT (raw)"
              value={bitString}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
              }}
            />
            <Tooltip title="Скопировать битовую строку">
              <IconButton
                onClick={() => copy(bitString)}
                aria-label="copy bits"
                size="small"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ md: "center" }}
          >
            <TextField
              fullWidth
              size="small"
              label="HEX (raw)"
              value={hexDisplay}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
              }}
            />
            <Tooltip title="Скопировать HEX">
              <IconButton
                onClick={() => copy(hexDisplay)}
                aria-label="copy hex"
                size="small"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ md: "center" }}
          >
            <TextField
              fullWidth
              size="small"
              label="BigInt (raw padded to byte)"
              value={bigIntDisplay}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
              }}
            />
            <Tooltip title="Скопировать BigInt">
              <IconButton
                onClick={() => copy(bigIntDisplay)}
                aria-label="copy bigint"
                size="small"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <DescriptionIcon fontSize="small" />
            <Typography variant="caption" color="text.secondary">
              В режиме «не дополнять/не обрезать» вход не нормализуется:
              недостающие функции помечаются, хвост сохраняется. Экспорт HEX
              выравнивает только до полного байта, без изменения внутреннего
              буфера.
            </Typography>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
};
