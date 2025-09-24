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
} from "@mui/material";
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

interface Props {
  layout: FieldLayout[];
  width: number;
}

export const Composer: React.FC<Props> = ({ layout, width }) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [bitString, setBitString] = useState(""); // ТЕКУЩИЙ ВХОД (любой длины, может иметь хвост)
  const [baseBits, setBaseBits] = useState(""); // FRAME ширины width — для декодирования/опций
  const [hexInput, setHexInput] = useState("");
  const [rawBits, setRawBits] = useState("");
  const [mode, setMode] = useState<"options" | "bits" | "hex">("options");

  // Политика нормализации
  const [padDirection, setPadDirection] = useState<PadDirection>("none"); // 'left' | 'right' | 'none'
  const [trimDirection, setTrimDirection] = useState<TrimDirection>("none"); // 'left' | 'right' | 'none'

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

  // Конфликты / статусы
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
  const [tailBits, setTailBits] = useState(""); // хвост сверх ширины
  const [shortDelta, setShortDelta] = useState(0); // насколько короче вход

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

  const recomputeStatuses = useCallback(
    (frameBits: string, fullInputBits: string) => {
      // Статусы UNKNOWN/LOCKED считаем по frameBits, покрытие — по длине fullInputBits
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
          unknown: !c.full ? false : !d?.option, // UNKNOWN имеет смысл только если поле полностью покрыто входом
          conflictLocked: false,
          missing: c.missing,
          partial: c.partial,
        };
      }
      setFieldStatuses(statuses);
    },
    [layout]
  );

  // Наложение опций (работает всегда в рамках width)
  const reencodeFromSelections = (sel: Record<string, string>) => {
    const { bitString: outBits, conflicts: c } =
      BitConfigCore.overlaySelections(layout, baseBits, sel, locked);
    // base обновляем всегда; bitString (вход) оставляем как есть (может иметь хвост)
    setBaseBits(outBits);
    setConflicts(c);
    // пересчёт selections (нормализация)
    const decoded = BitConfigCore.decodeBits(layout, outBits);
    const next: Record<string, string> = {};
    for (const f of layout) {
      const d = decoded.byKindKey[f.kindKey];
      next[f.kindKey] = d?.option ? d.option.key : d?.binary;
    }
    setSelections(next);
    recomputeStatuses(outBits, bitString);
  };

  // Применение произвольных BIT
  const applyBits = () => {
    const raw = rawBits.replace(/[^01]/g, "");
    if (padDirection === "none" || trimDirection === "none") {
      // НЕ дополняем/НЕ обрезаем: bitString = как есть, baseBits = вплавить покрываемую часть
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

    // Строгая нормализация (старое поведение)
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
      // аналогично BIT
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

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">2) Компоновка конфигурации</Typography>
        <Tabs value={mode} onChange={(_, v) => setMode(v)}>
          <Tab value="options" label="Опции" />
          <Tab value="bits" label="Биты" />
          <Tab value="hex" label="HEX" />
        </Tabs>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="pad-dir">Дополнение (короче width)</InputLabel>
            <Select
              labelId="pad-dir"
              label="Дополнение (короче width)"
              value={padDirection}
              onChange={(e) => setPadDirection(e.target.value as PadDirection)}
            >
              <MenuItem value="left">слева нулями</MenuItem>
              <MenuItem value="right">справа нулями</MenuItem>
              <MenuItem value="none">не дополнять</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="trim-dir">Обрезка (длиннее width)</InputLabel>
            <Select
              labelId="trim-dir"
              label="Обрезка (длиннее width)"
              value={trimDirection}
              onChange={(e) =>
                setTrimDirection(e.target.value as TrimDirection)
              }
            >
              <MenuItem value="left">
                обрезать слева (оставить младшие)
              </MenuItem>
              <MenuItem value="right">
                обрезать справа (оставить старшие)
              </MenuItem>
              <MenuItem value="none">не обрезать</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
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
          </Stack>
        </Stack>
      </Paper>

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

      {/* Подсветка ситуаций «не дополнять/не обрезать» */}
      {(padDirection === "none" || trimDirection === "none") && (
        <>
          {shortDelta > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Входная битстрока короче ширины кадра на <b>{shortDelta}</b> бит.
              Функции, полностью выходящие за пределы входа, помечены как{" "}
              <b>MISSING</b>, частично покрытые — как <b>PARTIAL</b>.
            </Alert>
          )}
          {tailBits && tailBits.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Входная битстрока длиннее ширины кадра на <b>{tailBits.length}</b>{" "}
              бит. Хвост сохраняется и считается <b>«неизвестными функциями»</b>
              .
            </Alert>
          )}
        </>
      )}

      {tailBits && tailBits.length > 0 && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 2, borderColor: "info.main" }}
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

      {conflicts.length > 0 && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, borderColor: "warning.main" }}
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
          <IconButton onClick={() => copy(bitString)} aria-label="copy bits">
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
          <IconButton onClick={() => copy(hexDisplay)} aria-label="copy hex">
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
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <DescriptionIcon fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            В режиме «не дополнять/не обрезать» вход не нормализуется:
            недостающие функции помечаются, хвост сохраняется. Экспорт HEX
            всегда выравнивает <i>только до полного байта</i> справа, не трогая
            содержимое и длину относительно кадра.
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
