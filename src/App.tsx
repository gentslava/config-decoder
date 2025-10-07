// src/App.tsx
import React, { useState } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Typography,
  Alert,
  Button,
  Dialog,
  Stack,
  Snackbar,
} from "@mui/material";
import BuildIcon from '@mui/icons-material/Build';
import { HexEditor } from "./components/HexEditor";
import { useBitConfig } from "./hooks/useBitConfig";
import { BitConfigCore } from "./core/bitConfig";
import { ConfigPanel } from "./components/ConfigPanel";
import { Composer } from "./components/Composer";
import MobileDock from "./components/MobileDock";
import { SEED } from "./constants/seed";
import { APP_BRAND, APP_TAGLINE } from "./constants/brand";
import ThemeToggle from "./components/ThemeToggle";
import { OUTER_THEME } from "./core/muiConfig";

const App: React.FC = () => {
  const seedJson = JSON.stringify(SEED, null, 2);
  const { rawJson, setRawJson, layout, error, setError, width } =
    useBitConfig(seedJson);
  const [hexSnapshot, setHexSnapshot] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [bitString, setBitString] = useState("");
  const [configOpen, setConfigOpen] = useState(false);

  // Snackbar
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: "",
  });
  const notify = (msg: string) => setToast({ open: true, msg });
  const closeToast = () => setToast((s) => ({ ...s, open: false }));

  // действия MobileDock
  const openFile = async () => {
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
  };
  const applyConfig = () => {
    try {
      const parsed = JSON.parse(rawJson);
      BitConfigCore.buildBitLayout(parsed);
      setRawJson(rawJson);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };
  const copyHex = () => navigator.clipboard?.writeText(hexSnapshot || "");

  return (
    <ThemeProvider theme={OUTER_THEME} defaultMode="system">
      <CssBaseline />
      <Stack
        maxWidth="lg"
        sx={{
          py: { xs: 2, md: 4 },
          px: { xs: 1.5, sm: 2 },
          pb: { xs: "88px", md: 0 },
          gap: 3,
          justifySelf: "center"
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ fontSize: { xs: 24, sm: 32, md: 36 } }}
            >
              {APP_BRAND}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {APP_TAGLINE}
            </Typography>
          </Box>
          <Stack direction="row">
            <Box sx={{ mb: 2 }}>
              <Button startIcon={<BuildIcon />} onClick={() => setConfigOpen(true)}>
                Настроить конфиг
              </Button>
            </Box>
            <Box sx={{ ml: 2 }}>
              <ThemeToggle />
            </Box>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <HexEditor
          bitString={bitString}
          hexInput={hexInput}
          setHexInput={setHexInput}
          setBitString={setBitString}
          setError={setError}
          notify={notify}
        />

        <Composer
          layout={layout}
          width={width}
          onHexSnapshot={setHexSnapshot}
          hexInput={hexInput}
          setHexInput={setHexInput}
          notify={notify}
        />

        {/* Модальное окно с ConfigPanel (MUI Dialog) */}
        <Dialog
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <Box sx={{ p: 2, position: "relative" }}>
            <Button
              variant="text"
              onClick={() => setConfigOpen(false)}
              sx={{ position: "absolute", top: 8, right: 8 }}
            >
              Закрыть
            </Button>
            <ConfigPanel
              rawJson={rawJson}
              setRawJson={setRawJson}
              layout={layout}
              width={width}
              onApply={applyConfig}
            />
          </Box>
        </Dialog>
      </Stack>

      <MobileDock
        onUpload={openFile}
        onApply={applyConfig}
        onCopyHex={copyHex}
        disabledCopy={!hexSnapshot}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={1600}
        onClose={closeToast}
        message={toast.msg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </ThemeProvider>
  );
};

export default App;
