// src/App.tsx
import React, { useMemo, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import { useBitConfig } from "./hooks/useBitConfig";
import { BitConfigCore } from "./core/bitConfig";
import { ConfigPanel } from "./components/ConfigPanel";
import { Composer } from "./components/Composer";
import MobileDock from "./components/MobileDock";
import { SEED } from "./constants/seed";
import { APP_BRAND, APP_TAGLINE } from "./constants/brand";

const App: React.FC = () => {
  const seedJson = JSON.stringify(SEED, null, 2);
  const { rawJson, setRawJson, layout, error, setError, width } =
    useBitConfig(seedJson);

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: "light" },
        typography: {
          fontFamily: [
            "Inter",
            "Roboto",
            "system-ui",
            "Arial",
            "sans-serif",
          ].join(","),
        },
      }),
    []
  );

  // snapshot актуального HEX из Composer (для MobileDock)
  const [hexSnapshot, setHexSnapshot] = useState("");

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, md: 4 },
          px: { xs: 1.5, sm: 2 },
          // чтобы контент не уезжал под док-панель
          pb: { xs: "88px", md: 0 },
        }}
      >
        <Box sx={{ mb: { xs: 2, md: 3 } }}>
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <ConfigPanel
          rawJson={rawJson}
          setRawJson={setRawJson}
          layout={layout}
          width={width}
          onApply={applyConfig}
        />

        <Composer
          layout={layout}
          width={width}
          // снапшотим HEX для док-панели
          onHexSnapshot={(hex) => setHexSnapshot(hex)}
        />
      </Container>

      {/* Нижняя док-панель (только xs/sm) */}
      <MobileDock
        onUpload={openFile}
        onApply={applyConfig}
        onCopyHex={copyHex}
        disabledCopy={!hexSnapshot}
      />
    </ThemeProvider>
  );
};

export default App;
