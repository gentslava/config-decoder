// src/components/Composer.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  TextField,
  IconButton,
  Alert,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
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
import { HexEditor } from "./HexEditor";

type Props = {
  layout: FieldLayout[];
  width: number;
  /** Текущий HEX наверх (для мобильной док-панели) */
  onHexSnapshot?: (hex: string) => void;
};

export const Composer: React.FC<Props> = ({ layout, width, onHexSnapshot }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  // ------- состояние -------
  const [selections, setSelections] = useState<Record<string, string>>({});
  /** Полный "вход" пользователя: может быть любой длины, включая хвост > width */
  const [bitString, setBitString] = useState("");
  /** Внутренний кадр фиксированной ширины для декодирования опций */
  const [baseBits, setBaseBits] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [rawBits, setRawBits] = useState("");
  const [mode, setMode] = useState<"options" | "bits" | "hex">("options");

  // Политика нормализации/обрезки (включает 'none')
  const [padDirection, setPadDirection] = useState<PadDirection>("none");
  const [trimDirection, setTrimDirection] = useState<TrimDirection>("none");

  // Блокировки
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const toggleLock = (kindKey: string) =>
    setLocked((m) => ({ ...m, [kindKey]: !m[kindKey] }));
  const lockAll = () => {
    const next: Record<string, boolean> = {};
    for (const f of layout) next[f.kindKey] = true;
    setLocked(next);
  };
  const unlockAll = () => setLocked({});

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

  const copy = (t: string) => navigator.clipboard?.writeText(String(t));

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

    // === НОВОЕ: корректно обновляем "Текущий результат" ===
    let nextResultBits: string;
    if (padDirection === "none" || trimDirection === "none") {
      // Не дополняем и не обрезаем: оверлеим голову текущего bitString длиной L
      const L = Math.min(bitString.length, width);
      nextResultBits =
        L > 0 ? outBits.slice(0, L) + bitString.slice(L) : bitString;
      setBitString(nextResultBits);
      // tailBits/shortDelta сохраняем как были — мы их не меняем селекторами
    } else {
      // Строгий режим: результат = полный кадр
      nextResultBits = outBits;
      setBitString(nextResultBits);
      setTailBits("");
      setShortDelta(0);
    }

    // Обновляем selections из декодирования по кадру
    const decoded = BitConfigCore.decodeBits(layout, outBits);
    const nextSel: Record<string, string> = {};
    for (const f of layout) {
      const d = decoded.byKindKey[f.kindKey];
      nextSel[f.kindKey] = d?.option ? d.option.key : d?.binary;
    }
    setSelections(nextSel);

    // Статусы считаем: frame=outBits, вход=nextResultBits (с учетом хвоста/длины)
    recomputeStatuses(outBits, nextResultBits);
  };

  // Применение произвольных BIT
  const applyBits = () => {
    const raw = rawBits.replace(/[^01]/g, "");
    // Режим: не дополнять/не обрезать — вход как есть, кадр обновляем покрытой частью
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

    // Строгая нормализация — здесь padDirection/trimDirection уже типа 'left' | 'right'
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
    } catch (e: any) {
      alert(e.message || String(e));
    }
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
          2) Компоновка конфигурации
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
        </Tabs>
      </Stack>

      {/* Панель настроек нормализации + действия блокировок */}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ md: "center" }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
            <InputLabel id="pad-dir">Дополнение (короче width)</InputLabel>
            <Select
              labelId="pad-dir"
              label="Дополнение (короче width)"
              value={padDirection}
              onChange={onPadDirChange}
            >
              <MenuItem value="left">слева нулями</MenuItem>
              <MenuItem value="right">справа нулями</MenuItem>
              <MenuItem value="none">не дополнять</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 240 } }}>
            <InputLabel id="trim-dir">Обрезка (длиннее width)</InputLabel>
            <Select
              labelId="trim-dir"
              label="Обрезка (длиннее width)"
              value={trimDirection}
              onChange={onTrimDirChange}
            >
              <MenuItem value="left">обрезать слева</MenuItem>
              <MenuItem value="right">обрезать справа</MenuItem>
              <MenuItem value="none">не обрезать</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            {isXs ? (
              <>
                <Tooltip title="Заблокировать все">
                  <IconButton size="small" onClick={lockAll}>
                    <LockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Разблокировать все">
                  <IconButton size="small" onClick={unlockAll}>
                    <LockOpenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Button size="small" startIcon={<LockIcon />} onClick={lockAll}>
                  Заблокировать все
                </Button>
                <Button
                  size="small"
                  startIcon={<LockOpenIcon />}
                  onClick={unlockAll}
                >
                  Разблокировать все
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

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
          applyBits={applyBits}
        />
      )}

      {mode === "hex" && (
        <HexEditor
          bitString={bitString}
          hexInput={hexInput}
          setHexInput={setHexInput}
          setFromHex={setFromHex}
        />
      )}

      {/* Подсказки режима "не дополнять/не обрезать" */}
      {(padDirection === "none" || trimDirection === "none") && (
        <>
          {shortDelta > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Входная битстрока короче ширины кадра на <b>{shortDelta}</b> бит.
              Поля вне входа отмечены как <b>MISSING</b> или <b>PARTIAL</b>.
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
      {tailBits && tailBits.length > 0 && (
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

      <Divider sx={{ my: 2 }} />

      {/* Конфликты блокировок */}
      {conflicts.length > 0 && (
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
      <Stack spacing={1}>
        <Typography variant="subtitle2">Текущий результат</Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
          <IconButton
            onClick={() => copy(bitString)}
            aria-label="copy bits"
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
          <IconButton
            onClick={() => copy(hexDisplay)}
            aria-label="copy hex"
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
          <IconButton
            onClick={() => copy(bigIntDisplay)}
            aria-label="copy bigint"
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
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
    </Paper>
  );
};
