// src/components/ConfigPanel.tsx
import React, { useMemo, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  Chip,
  Box,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  useMediaQuery,
  useTheme,
  Grid,
  Snackbar,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ConstructionIcon from "@mui/icons-material/Construction";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import { TableVirtuoso, TableComponents } from "react-virtuoso";
import type { FieldLayout } from "../core/bitConfig";

type Props = {
  rawJson: string;
  onApply: (text: string) => void;
  layout: FieldLayout[];
  width: number;
  setRawJson: (text: string) => void;
};

export const ConfigPanel: React.FC<Props> = ({
  rawJson,
  onApply,
  layout,
  width,
  setRawJson,
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [jsonCollapsed, setJsonCollapsed] = useState(true);
  const [layoutCollapsed, setLayoutCollapsed] = useState(false);

  // Snackbar
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: "",
  });
  const notify = (msg: string) => setToast({ open: true, msg });
  const closeToast = () => setToast((s) => ({ ...s, open: false }));

  // Превью JSON
  const jsonPreview = useMemo(() => {
    const max = 800;
    return rawJson.length > max ? rawJson.slice(0, max) + "…" : rawJson;
  }, [rawJson]);

  // Превью раскладки
  const previewCount = 12;
  const previewLayout = useMemo(() => layout.slice(0, previewCount), [layout]);

  // Виртуализированные компоненты таблицы
  const VirtuosoTableComponents: TableComponents<FieldLayout> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight: { xs: 360, md: 520 } }}
        {...props}
        ref={ref}
      />
    )) as TableComponents<FieldLayout>["Scroller"],
    Table: (props) => <Table size="small" stickyHeader {...props} />,
    TableHead: (props) => <TableHead {...props} />,
    TableRow: (props) => <TableRow {...props} />,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <TableBody {...props} ref={ref} />
    )),
  };

  const fixedHeader = () => (
    <TableRow>
      <TableCell>Name</TableCell>
      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
        HAL
      </TableCell>
      <TableCell align="right">Start</TableCell>
      <TableCell align="right">Len</TableCell>
    </TableRow>
  );

  const rowContent = (_index: number, f: FieldLayout) => (
    <>
      <TableCell>
        <Typography fontWeight={600}>{f.nameEn}</Typography>
        {f.introduce && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", md: "block" } }}
          >
            {f.introduce}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
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
    </>
  );

  const openFile = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      setRawJson(text);
      notify("Файл загружен");
    };
    input.click();
  };

  const downloadFile = () => {
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Скачивание началось");
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      {/* Верхняя панель с действиями */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: { xs: 1, md: 2 } }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: 18, md: 20 } }}>
          1) Конфигурация
        </Typography>

        {isXs ? (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Загрузить JSON">
              <IconButton size="small" onClick={openFile}>
                <UploadFileIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Скачать JSON">
              <IconButton size="small" onClick={downloadFile}>
                <FileDownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Применить конфигурацию">
              <IconButton
                color="primary"
                size="small"
                onClick={() => {
                  onApply(rawJson);
                  notify("Конфигурация применена");
                }}
              >
                <ConstructionIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<UploadFileIcon />} onClick={openFile}>
              Загрузить
            </Button>
            <Button startIcon={<FileDownloadIcon />} onClick={downloadFile}>
              Скачать
            </Button>
            <Button
              variant="contained"
              startIcon={<ConstructionIcon />}
              onClick={() => {
                onApply(rawJson);
                notify("Конфигурация применена");
              }}
            >
              Применить
            </Button>
          </Stack>
        )}
      </Stack>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Всего бит
            </Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              sx={{ fontSize: { xs: 18, md: 24 } }}
            >
              {width}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Функций
            </Typography>
            <Typography
              variant="h5"
              fontWeight={600}
              sx={{ fontSize: { xs: 18, md: 24 } }}
            >
              {layout.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* JSON */}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
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

        {/* Превью JSON (свернутое состояние редактирования) */}
        <Collapse in={jsonCollapsed} unmountOnExit={false}>
          <Paper
            variant="outlined"
            sx={{ p: 1, bgcolor: "background.default" }}
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
                maxHeight: { xs: 160, md: 200 },
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

        {/* Полное редактирование JSON */}
        <Collapse in={!jsonCollapsed} unmountOnExit>
          <TextField
            label="JSON"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            multiline
            minRows={isXs ? 10 : 18}
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

      {/* Раскладка */}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
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

        {/* Превью (первые N строк) */}
        <Collapse in={layoutCollapsed} unmountOnExit={false}>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: 300 }}
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
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>

        {/* Полная таблица (виртуализация) */}
        <Collapse in={!layoutCollapsed} unmountOnExit>
          <TableVirtuoso
            data={layout}
            components={VirtuosoTableComponents}
            fixedHeaderContent={fixedHeader}
            itemContent={rowContent}
            style={{ height: isXs ? 360 : 520 }}
            increaseViewportBy={{ top: 200, bottom: 600 }}
          />
          <Divider sx={{ mt: 1 }} />
        </Collapse>
      </Paper>

      {/* Snackbar для UX-подсказок */}
      <Snackbar
        open={toast.open}
        autoHideDuration={1500}
        onClose={closeToast}
        message={toast.msg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Paper>
  );
};
