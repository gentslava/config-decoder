import { useMemo, useState } from "react";
import { BitConfigCore } from "../core/bitConfig";
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export const Encoder = ({ layout }) => {
  const [selections, setSelections] = useState(
    /** @type {Record<string,string>} */ ({})
  );
  const [encoded, setEncoded] = useState({ bitString: "", bigInt: 0n });

  const handleEncode = () => {
    const out = BitConfigCore.encodeSelections(layout, selections);
    setEncoded(out);
  };

  const copy = (text) => navigator.clipboard?.writeText(String(text));

  // HEX строка (байты, через пробел)
  const hexString = useMemo(() => {
    if (!encoded.bitString) return "";
    const bytes = BitConfigCore.bitStringToBytes(encoded.bitString);
    return BitConfigCore.bytesToHex(bytes);
  }, [encoded.bitString]);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">2) Выбор значений и кодирование</Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<DataObjectIcon />} onClick={handleEncode}>
            Кодировать
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              setSelections({});
              setEncoded({ bitString: "", bigInt: 0n });
            }}
          >
            Сброс
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Stack spacing={2} flex={1}>
          {layout.map((f) => {
            const options = Array.from(f.byKey.values());
            const current = selections[f.kindKey] ?? "";
            const isBinary = current && !f.byKey.has(current);
            return (
              <Paper key={f.kindKey} variant="outlined" sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography fontWeight={600}>{f.nameEn}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    start {f.start} • len {f.length}
                  </Typography>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <Select
                    displayEmpty
                    value={f.byKey.has(current) ? current : ""}
                    onChange={(e) =>
                      setSelections((s) => ({
                        ...s,
                        [f.kindKey]: e.target.value,
                      }))
                    }
                    sx={{ flex: 1, minWidth: 260 }}
                    size="small"
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
                      setSelections((s) => ({
                        ...s,
                        [f.kindKey]: v.slice(-f.length),
                      }));
                    }}
                    InputProps={{
                      sx: {
                        fontFamily: "JetBrains Mono, ui-monospace, monospace",
                      },
                    }}
                  />
                </Stack>
              </Paper>
            );
          })}
          {layout.length === 0 && (
            <Typography color="text.secondary">
              Нет полей для выбора.
            </Typography>
          )}
        </Stack>

        <Stack spacing={2} flex={1}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Результат кодирования — BIT
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                fullWidth
                size="small"
                value={encoded.bitString}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
                }}
              />
              <IconButton
                onClick={() => copy(encoded.bitString)}
                aria-label="copy bits"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                BigInt:
              </Typography>
              <Chip
                size="small"
                label={
                  "0b" + (encoded.bigInt ? encoded.bigInt.toString(2) : "")
                }
              />
              <IconButton
                onClick={() =>
                  copy(
                    "0b" + (encoded.bigInt ? encoded.bigInt.toString(2) : "")
                  )
                }
                aria-label="copy bigint"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Результат кодирования — HEX (байты)
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={hexString}
              multiline
              minRows={3}
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  whiteSpace: "pre-wrap",
                },
              }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                onClick={() => copy(hexString)}
                startIcon={<ContentCopyIcon fontSize="small" />}
              >
                Копировать HEX
              </Button>
              <Button
                size="small"
                onClick={() => {
                  const blob = new Blob([hexString + ""], {
                    type: "text/plain",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "config.hex.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Скачать .hex
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Stack>
    </Paper>
  );
};
