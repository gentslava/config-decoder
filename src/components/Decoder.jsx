import { useMemo, useState } from "react";
import { BitConfigCore } from "../core/bitConfig";
import {
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";

export const Decoder = ({ layout }) => {
  const width = useMemo(() => BitConfigCore.totalBits(layout), [layout]);
  const [decodeInput, setDecodeInput] = useState("");
  const [decoded, setDecoded] = useState(null);

  const handleDecode = () => {
    const out = BitConfigCore.decodeBits(layout, decodeInput);
    setDecoded(out);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        3) Декодирование битстроки
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          fullWidth
          size="small"
          label={`вставьте ${width}-битную строку`}
          value={decodeInput}
          onChange={(e) => setDecodeInput(e.target.value.replace(/[^01]/g, ""))}
          InputProps={{
            sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
          }}
        />
        <Button startIcon={<DataObjectIcon />} onClick={handleDecode}>
          Декодировать
        </Button>
      </Stack>

      {decoded && (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ mt: 2, maxHeight: 360 }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Bits</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {layout.map((f) => {
                const d = decoded.byKindKey[f.kindKey];
                const valLabel = d?.option
                  ? `${d.option.key} — ${d.option.nameEn}`
                  : "(нет соответствия)";
                return (
                  <TableRow key={f.kindKey} hover>
                    <TableCell>{f.nameEn}</TableCell>
                    <TableCell>{valLabel}</TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "JetBrains Mono, monospace" }}
                      >
                        {d?.binary}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
