// src/components/ConfigPanel.tsx
import {
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Box,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ConstructionIcon from "@mui/icons-material/Construction";
import type { FieldLayout } from "../core/bitConfig";

interface Props {
  rawJson: string;
  onApply: (text: string) => void;
  layout: FieldLayout[];
  width: number;
  setRawJson: (text: string) => void;
}

export const ConfigPanel: React.FC<Props> = ({
  rawJson,
  onApply,
  layout,
  width,
  setRawJson,
}) => (
  <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 2 }}
    >
      <Typography variant="h6">1) Конфигурация</Typography>
      <Stack direction="row" spacing={1}>
        <Button
          startIcon={<UploadFileIcon />}
          onClick={async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              const text = await file.text();
              setRawJson(text);
            };
            input.click();
          }}
        >
          Загрузить
        </Button>
        <Button
          startIcon={<FileDownloadIcon />}
          onClick={() => {
            const blob = new Blob([rawJson], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "config.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Скачать
        </Button>
        <Button
          variant="contained"
          startIcon={<ConstructionIcon />}
          onClick={() => onApply(rawJson)}
        >
          Применить
        </Button>
      </Stack>
    </Stack>

    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        label="JSON"
        value={rawJson}
        onChange={(e) => setRawJson(e.target.value)}
        multiline
        minRows={18}
        fullWidth
        InputProps={{
          sx: {
            fontFamily:
              "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
          },
        }}
      />

      <Stack spacing={2} sx={{ minWidth: 320, flex: 1 }}>
        <Stack direction="row" spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Всего бит
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {width}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Функций
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {layout.length}
            </Typography>
          </Paper>
        </Stack>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Раскладка
          </Typography>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: 320 }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>HAL</TableCell>
                  <TableCell align="right">Start</TableCell>
                  <TableCell align="right">Len</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {layout.map((f) => (
                  <TableRow key={f.kindKey} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{f.nameEn}</Typography>
                      {f.introduce && (
                        <Typography variant="caption" color="text.secondary">
                          {f.introduce}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {f.halKey}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={f.start} />
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={f.length} />
                    </TableCell>
                  </TableRow>
                ))}
                {layout.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">
                        Загрузите валидный конфиг
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
    </Stack>
  </Paper>
);
