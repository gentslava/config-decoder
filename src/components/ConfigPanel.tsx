// src/components/ConfigPanel.tsx
import React, { useMemo, useState } from "react";
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
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  TablePagination,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ConstructionIcon from "@mui/icons-material/Construction";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
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
}) => {
  // --- сворачивание секций ---
  const [jsonCollapsed, setJsonCollapsed] = useState(false);
  const [layoutCollapsed, setLayoutCollapsed] = useState(false);

  // --- превью JSON ---
  const jsonPreview = useMemo(() => {
    const max = 800;
    return rawJson.length > max ? rawJson.slice(0, max) + "…" : rawJson;
  }, [rawJson]);

  // --- пагинация для полной таблицы раскладки ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };
  const pagedLayout = useMemo(
    () => layout.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [layout, page, rowsPerPage]
  );

  // --- мини-превью таблицы при сворачивании ---
  const previewCount = 12;
  const previewLayout = useMemo(() => layout.slice(0, previewCount), [layout]);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">1) Конфигурация</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Загрузить JSON">
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
          </Tooltip>
          <Tooltip title="Скачать текущий JSON">
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
          </Tooltip>
          <Tooltip title="Проверить и применить конфигурацию">
            <Button
              variant="contained"
              startIcon={<ConstructionIcon />}
              onClick={() => onApply(rawJson)}
            >
              Применить
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Сводка по конфигу */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Отображение
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Tooltip
              title={jsonCollapsed ? "Развернуть JSON" : "Свернуть JSON"}
            >
              <IconButton
                size="small"
                onClick={() => setJsonCollapsed((v) => !v)}
              >
                {jsonCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                layoutCollapsed ? "Развернуть раскладку" : "Свернуть раскладку"
              }
            >
              <IconButton
                size="small"
                onClick={() => setLayoutCollapsed((v) => !v)}
              >
                {layoutCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </Stack>

      {/* Блок JSON */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle2">JSON</Typography>
          <IconButton size="small" onClick={() => setJsonCollapsed((v) => !v)}>
            {jsonCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
          </IconButton>
        </Stack>

        {/* Компактное превью при сворачивании */}
        <Collapse in={jsonCollapsed} unmountOnExit={false}>
          <Paper
            variant="outlined"
            sx={{ p: 1.5, bgcolor: "background.default" }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              Превью (read-only)
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1,
                maxHeight: 200,
                overflow: "auto",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {jsonPreview}
            </Box>
          </Paper>
        </Collapse>

        {/* Полноценный редактор при развороте */}
        <Collapse in={!jsonCollapsed} unmountOnExit>
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
        </Collapse>
      </Paper>

      {/* Блок раскладки */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle2">Раскладка</Typography>
          <IconButton
            size="small"
            onClick={() => setLayoutCollapsed((v) => !v)}
          >
            {layoutCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Stack>

        {/* Компактное превью таблицы */}
        <Collapse in={layoutCollapsed} unmountOnExit={false}>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: 360 }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Start</TableCell>
                  <TableCell align="right">Len</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewLayout.map((f) => (
                  <TableRow key={f.kindKey} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{f.nameEn}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={f.start} />
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={f.length} />
                    </TableCell>
                  </TableRow>
                ))}
                {layout.length > previewCount && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="caption" color="text.secondary">
                        Показаны первые {previewCount} из {layout.length}.
                        Разверните, чтобы увидеть всё.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {layout.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="text.secondary">
                        Загрузите валидный конфиг
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>

        {/* Полная таблица с пагинацией */}
        <Collapse in={!layoutCollapsed} unmountOnExit>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: 480 }}
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
                {pagedLayout.map((f) => (
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

          <Divider sx={{ my: 1 }} />
          <TablePagination
            component="div"
            count={layout.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Строк на странице"
          />
        </Collapse>
      </Paper>
    </Paper>
  );
};
