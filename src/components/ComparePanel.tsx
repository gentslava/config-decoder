// src/components/ComparePanel.tsx
import React, { useMemo, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Chip,
  Tooltip,
  Box,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DifferenceIcon from "@mui/icons-material/Difference";
import HexagonIcon from "@mui/icons-material/Hexagon";
import BinaryIcon from "@mui/icons-material/Numbers";
import ContentPasteGoIcon from "@mui/icons-material/ContentPasteGo";
import { TableVirtuoso, TableComponents } from "react-virtuoso";
import {
  BitConfigCore,
  FieldLayout,
  PadDirection,
  TrimDirection,
} from "../core/bitConfig";

type Props = {
  layout: FieldLayout[];
  width: number;
  padDirection: PadDirection;
  trimDirection: TrimDirection;
  currentBits: string;
};

type Coverage = "none" | "partial" | "full";

type DiffRow = {
  field: Pick<FieldLayout, "nameEn" | "halKey" | "start" | "length"> & {
    kindKey?: string;
  };
  aCov: Coverage;
  bCov: Coverage;
  aBits?: string;
  bBits?: string;
  equal: boolean;
  aOptKey?: string;
  aOptName?: string;
  aUnknown?: boolean;
  bOptKey?: string;
  bOptName?: string;
  bUnknown?: boolean;

  // хвостовые спец-строки
  isTail?: boolean;
  tailKind?: "byte" | "bit";
  displayA?: string; // форматированное представление для A (HEX/бит)
  displayB?: string; // для B
};

const cover = (len: number, start: number, length: number): Coverage => {
  if (length <= 0) return "none";
  if (len <= start) return "none";
  if (len >= start + length) return "full";
  return "partial";
};

const resolveOption = (f: FieldLayout, bits: string | undefined) => {
  if (!bits) return { key: undefined, name: undefined, unknown: false };
  const opts = Array.from(f.byKey.values());
  const opt = opts.find((o) => o.value === bits);
  if (opt) return { key: opt.key, name: opt.nameEn || opt.key, unknown: false };
  return { key: undefined, name: undefined, unknown: true };
};

export const ComparePanel: React.FC<Props> = ({
  layout,
  width,
  padDirection,
  trimDirection,
  currentBits,
}) => {
  // Вводы A/B
  const [hexA, setHexA] = useState("");
  const [bitsA, setBitsA] = useState("");
  const [hexB, setHexB] = useState("");
  const [bitsB, setBitsB] = useState("");

  // чем применили (влияет на единицы измерения start/len и формат хвоста)
  const [aSource, setASource] = useState<"hex" | "bits">("bits");
  const [bSource, setBSource] = useState<"hex" | "bits">("bits");

  // нормализованные bit-строки
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  const [onlyDiff, setOnlyDiff] = useState(true);

  const aInfo = useMemo(
    () => ({
      len: a.length,
      tail: a.length > width ? a.length - width : 0,
      short: a.length < width ? width - a.length : 0,
    }),
    [a, width]
  );

  const bInfo = useMemo(
    () => ({
      len: b.length,
      tail: b.length > width ? b.length - width : 0,
      short: b.length < width ? width - b.length : 0,
    }),
    [b, width]
  );

  const applyInput = (
    hex: string,
    bits: string,
    setOut: (v: string) => void,
    setSrc: (s: "hex" | "bits") => void
  ) => {
    const usingHex = hex.trim().length > 0;
    const raw = usingHex
      ? BitConfigCore.bytesToBitString(BitConfigCore.hexToBytes(hex))
      : bits.replace(/[^01]/g, "");
    setSrc(usingHex ? "hex" : "bits");

    if (padDirection === "none" || trimDirection === "none") {
      setOut(raw);
    } else {
      const normalized = BitConfigCore.normalizeBitsToWidth(
        raw,
        width,
        padDirection,
        trimDirection
      );
      setOut(normalized);
    }
  };

  const applyCurrentTo = (side: "A" | "B") => {
    const raw = currentBits || "";
    const out =
      padDirection === "none" || trimDirection === "none"
        ? raw
        : BitConfigCore.normalizeBitsToWidth(
            raw,
            width,
            padDirection,
            trimDirection
          );

    const hex = BitConfigCore.bytesToHex(BitConfigCore.bitStringToBytes(out));

    if (side === "A") {
      setA(out);
      setHexA(hex);
      setBitsA(out);
      setASource("bits");
    } else {
      setB(out);
      setHexB(hex);
      setBitsB(out);
      setBSource("bits");
    }
  };

  // признак: показывать позиции/длины в БАЙТАХ
  const preferHex = useMemo(
    () => aSource === "hex" && bSource === "hex",
    [aSource, bSource]
  );

  // расчёт строк сравнения
  const diffData: DiffRow[] = useMemo(() => {
    if (!a && !b) return [];

    const rows: DiffRow[] = layout.map((f) => {
      const aCov = cover(a.length, f.start, f.length);
      const bCov = cover(b.length, f.start, f.length);

      const aBits =
        aCov === "full" ? a.slice(f.start, f.start + f.length) : undefined;
      const bBits =
        bCov === "full" ? b.slice(f.start, f.start + f.length) : undefined;

      const equal =
        aBits !== undefined && bBits !== undefined ? aBits === bBits : false;
      const aRes = resolveOption(f as FieldLayout, aBits);
      const bRes = resolveOption(f as FieldLayout, bBits);

      return {
        field: {
          nameEn: f.nameEn,
          halKey: f.halKey,
          start: f.start,
          length: f.length,
          kindKey: (f as any).kindKey,
        },
        aCov,
        bCov,
        aBits,
        bBits,
        equal,
        aOptKey: aRes.key,
        aOptName: aRes.name,
        aUnknown: aRes.unknown && aBits !== undefined,
        bOptKey: bRes.key,
        bOptName: bRes.name,
        bUnknown: bRes.unknown && bBits !== undefined,
      };
    });

    // хвостовые различия
    const startBit = width;
    const startByte = Math.floor(startBit / 8);

    const tailA = a.length > width ? a.slice(width) : "";
    const tailB = b.length > width ? b.slice(width) : "";
    const maxLenBits = Math.max(tailA.length, tailB.length);

    if (maxLenBits > 0) {
      if (preferHex) {
        // как байты (HEX)
        const bytesA = BitConfigCore.bitStringToBytes(a);
        const bytesB = BitConfigCore.bitStringToBytes(b);
        const maxBytes = Math.max(bytesA.length, bytesB.length);

        for (let bi = startByte; bi < maxBytes; bi++) {
          const va = bi < bytesA.length ? bytesA[bi] : undefined;
          const vb = bi < bytesB.length ? bytesB[bi] : undefined;
          if (va !== vb) {
            const hexA =
              va === undefined
                ? "—"
                : va.toString(16).toUpperCase().padStart(2, "0");
            const hexB =
              vb === undefined
                ? "—"
                : vb.toString(16).toUpperCase().padStart(2, "0");

            rows.push({
              isTail: true,
              tailKind: "byte",
              field: {
                nameEn: "UNKNOWN FUNCTIONS",
                halKey: "TAIL",
                start: bi * 8, // храним в битах, отображение вычислим ниже
                length: 8,
              },
              aCov: cover(a.length, bi * 8, 8),
              bCov: cover(b.length, bi * 8, 8),
              equal: false,
              displayA: hexA,
              displayB: hexB,
            });
          }
        }
      } else {
        // как биты
        for (let i = 0; i < maxLenBits; i++) {
          const va = i < tailA.length ? tailA[i] : ("-" as const);
          const vb = i < tailB.length ? tailB[i] : ("-" as const);
          if (va !== vb) {
            const abs = startBit + i;
            rows.push({
              isTail: true,
              tailKind: "bit",
              field: {
                nameEn: "UNKNOWN FUNCTIONS",
                halKey: "TAIL",
                start: abs,
                length: 1,
              },
              aCov: cover(a.length, abs, 1),
              bCov: cover(b.length, abs, 1),
              equal: false,
              displayA: va as string,
              displayB: vb as string,
            });
          }
        }
      }
    }

    return rows;
  }, [a, b, layout, width, preferHex]);

  // фильтр
  const filtered = useMemo(() => {
    if (!onlyDiff) return diffData;
    return diffData.filter((r) => {
      if (r.isTail) return true; // хвостовые строки добавляются только при различии
      if (r.aCov === "full" && r.bCov === "full") return !r.equal;
      return r.aCov !== r.bCov;
    });
  }, [diffData, onlyDiff]);

  // компоненты виртуализированной таблицы
  const VirtuosoTableComponents: TableComponents<DiffRow> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight: { xs: 420, md: 560 } }}
        {...props}
        ref={ref}
      />
    )) as TableComponents<DiffRow>["Scroller"],
    Table: (props) => (
      <Table
        size="small"
        stickyHeader
        sx={{
          tableLayout: "fixed",
          "& thead th": { whiteSpace: "nowrap" },
        }}
        {...props}
      />
    ),
    TableHead: (props) => <TableHead {...props} />,
    TableRow: (props) => <TableRow {...props} />,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <TableBody {...props} ref={ref} />
    )),
  };

  const head = () => (
    <TableRow>
      <TableCell sx={{ width: { xs: "30%", md: "30%" } }}>Function</TableCell>
      <TableCell sx={{ width: { xs: "30%", md: "30%" } }}>A</TableCell>
      <TableCell sx={{ width: { xs: "30%", md: "30%" } }}>B</TableCell>
      <TableCell align="right" sx={{ width: { xs: "10%", md: "10%" } }}>
        Status
      </TableCell>
    </TableRow>
  );

  const BitsMono = ({ value }: { value: string }) => (
    <Tooltip title={value}>
      <Typography
        variant="caption"
        sx={{
          fontFamily: "JetBrains Mono, ui-monospace",
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  );

  const OptChip = ({
    keyLabel,
    name,
    unknown,
  }: {
    keyLabel?: string;
    name?: string;
    unknown?: boolean;
  }) => {
    if (keyLabel) {
      const label = `${keyLabel} • ${name ?? keyLabel}`;
      return (
        <Tooltip title={label}>
          <Chip size="small" label={label} />
        </Tooltip>
      );
    }
    if (unknown) return <Chip size="small" color="info" label="UNKNOWN" />;
    return null;
  };

  // формат подписи start / len с учётом preferHex
  const renderStartLen = (startBits: number, lengthBits: number) => {
    if (preferHex) {
      const startByte = Math.floor(startBits / 8);
      const endBit = startBits + lengthBits;
      const endByteExclusive = Math.ceil(endBit / 8);
      const lenBytes = Math.max(1, endByteExclusive - startByte);
      return (
        <Typography variant="caption" color="text.secondary" noWrap>
          start {startByte} • len {lenBytes} {lenBytes === 1 ? "byte" : "bytes"}
        </Typography>
      );
    }
    return (
      <Typography variant="caption" color="text.secondary" noWrap>
        start {startBits} • len {lengthBits}
      </Typography>
    );
  };

  const row = (_: number, r: DiffRow) => {
    const covChip = (side: "A" | "B", cov: Coverage) => {
      if (cov === "full") return null;
      if (cov === "none")
        return (
          <Chip
            size="small"
            color="error"
            label={`${side}: MISSING`}
            sx={{ mr: 0.5 }}
          />
        );
      return (
        <Chip
          size="small"
          color="warning"
          label={`${side}: PARTIAL`}
          sx={{ mr: 0.5 }}
        />
      );
    };

    const diff = r.isTail
      ? true
      : r.aCov === "full" && r.bCov === "full"
      ? !r.equal
      : r.aCov !== r.bCov;

    const bg = diff
      ? "var(--mui-palette-error-light, rgba(244,67,54,0.08))"
      : undefined;
    const commonCellSx = { background: bg };

    const title = r.field.nameEn;

    return (
      <>
        {/* Function */}
        <TableCell sx={commonCellSx}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={r.field.halKey || title}>
              <Typography fontWeight={600} noWrap>
                {title}
              </Typography>
            </Tooltip>
            {r.isTail && <Chip size="small" variant="outlined" label="TAIL" />}
          </Stack>
          {renderStartLen(r.field.start, r.field.length)}
        </TableCell>

        {/* A */}
        <TableCell sx={commonCellSx}>
          {r.isTail ? (
            <Typography
              variant="caption"
              sx={{ fontFamily: "JetBrains Mono, ui-monospace" }}
            >
              {r.displayA}
            </Typography>
          ) : r.aCov === "full" ? (
            <Box>
              {r.aBits && <BitsMono value={r.aBits} />}
              <Box sx={{ mt: 0.5 }}>
                <OptChip
                  keyLabel={r.aOptKey}
                  name={r.aOptName}
                  unknown={r.aUnknown}
                />
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          )}
        </TableCell>

        {/* B */}
        <TableCell sx={commonCellSx}>
          {r.isTail ? (
            <Typography
              variant="caption"
              sx={{ fontFamily: "JetBrains Mono, ui-monospace" }}
            >
              {r.displayB}
            </Typography>
          ) : r.bCov === "full" ? (
            <Box>
              {r.bBits && <BitsMono value={r.bBits} />}
              <Box sx={{ mt: 0.5 }}>
                <OptChip
                  keyLabel={r.bOptKey}
                  name={r.bOptName}
                  unknown={r.bUnknown}
                />
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          )}
        </TableCell>

        {/* Status */}
        <TableCell align="right" sx={commonCellSx}>
          <Box
            sx={{
              display: "inline-flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: 0.5,
            }}
          >
            {r.aCov !== "full" && covChip("A", r.aCov)}
            {r.bCov !== "full" && covChip("B", r.bCov)}
            <Chip size="small" color="error" label="DIFF" />
          </Box>
        </TableCell>
      </>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2">Сравнение двух конфигураций</Typography>

        {/* Вводы A / B */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <DifferenceIcon fontSize="small" />
              <Typography variant="subtitle2">Вход A</Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Подставить текущий буфер">
                <span>
                  <Button
                    size="small"
                    startIcon={<ContentPasteGoIcon />}
                    onClick={() => applyCurrentTo("A")}
                  >
                    Из текущего
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Применить A">
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DoneIcon />}
                    onClick={() => applyInput(hexA, bitsA, setA, setASource)}
                  >
                    Применить A
                  </Button>
                </span>
              </Tooltip>
            </Stack>
            <Stack spacing={1}>
              <TextField
                size="small"
                label="HEX A"
                value={hexA}
                onChange={(e) => setHexA(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <HexagonIcon
                      fontSize="small"
                      sx={{ mr: 1, opacity: 0.7 }}
                    />
                  ) as any,
                }}
              />
              <TextField
                size="small"
                label="BITS A"
                value={bitsA}
                onChange={(e) => setBitsA(e.target.value)}
                InputProps={{
                  sx: { fontFamily: "JetBrains Mono, ui-monospace" },
                  startAdornment: (
                    <BinaryIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                  ) as any,
                }}
              />
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`len: ${aInfo.len}`} />
                {aInfo.short > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={`short: ${aInfo.short}`}
                  />
                )}
                {aInfo.tail > 0 && (
                  <Chip
                    size="small"
                    color="info"
                    label={`tail: ${aInfo.tail}`}
                  />
                )}
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <DifferenceIcon fontSize="small" />
              <Typography variant="subtitle2">Вход B</Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Подставить текущий буфер">
                <span>
                  <Button
                    size="small"
                    startIcon={<ContentPasteGoIcon />}
                    onClick={() => applyCurrentTo("B")}
                  >
                    Из текущего
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Применить B">
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DoneIcon />}
                    onClick={() => applyInput(hexB, bitsB, setB, setBSource)}
                  >
                    Применить B
                  </Button>
                </span>
              </Tooltip>
            </Stack>
            <Stack spacing={1}>
              <TextField
                size="small"
                label="HEX B"
                value={hexB}
                onChange={(e) => setHexB(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <HexagonIcon
                      fontSize="small"
                      sx={{ mr: 1, opacity: 0.7 }}
                    />
                  ) as any,
                }}
              />
              <TextField
                size="small"
                label="BITS B"
                value={bitsB}
                onChange={(e) => setBitsB(e.target.value)}
                InputProps={{
                  sx: { fontFamily: "JetBrains Mono, ui-monospace" },
                  startAdornment: (
                    <BinaryIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                  ) as any,
                }}
              />
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`len: ${bInfo.len}`} />
                {bInfo.short > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={`short: ${bInfo.short}`}
                  />
                )}
                {bInfo.tail > 0 && (
                  <Chip
                    size="small"
                    color="info"
                    label={`tail: ${bInfo.tail}`}
                  />
                )}
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <Alert severity="info">
          Режим нормализации унаследован из верхней панели:{" "}
          {`Дополнение = ${padDirection}, Обрезка = ${trimDirection}. `}
          Если оба входа применены из <b>HEX</b>, подпись <i>start/len</i> под
          названием функции показывается в <b>байтах</b>
          (start — индекс байта, len — количество байт). Иначе — в <b>битах</b>.
          Различия в хвосте добавляются как отдельные строки (по байтам для HEX,
          по битам — иначе).
        </Alert>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle2">Результат сравнения</Typography>
          <FormControlLabel
            control={
              <Switch checked={onlyDiff} onChange={(_, c) => setOnlyDiff(c)} />
            }
            label="Показывать только отличия"
          />
        </Stack>

        <TableVirtuoso
          data={filtered}
          components={VirtuosoTableComponents}
          fixedHeaderContent={head}
          itemContent={row}
          style={{ height: 420 }}
          increaseViewportBy={{ top: 200, bottom: 600 }}
        />

        {filtered.length === 0 && (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              {a || b
                ? "Отличий не найдено (или входы не покрывают поля полностью)."
                : "Введите A и B, затем нажмите «Применить». Можно подставить «Из текущего»."}
            </Typography>
          </>
        )}
      </Stack>
    </Paper>
  );
};
