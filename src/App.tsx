// src/App.tsx
import React, { useMemo } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { useBitConfig } from "./hooks/useBitConfig";
import { BitConfigCore } from "./core/bitConfig";
import { ConfigPanel } from "./components/ConfigPanel";
import { Composer } from "./components/Composer";
import { SEED } from "./const/seed";

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            BitConfig Playground
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Собирай конфиг: опциями, битовой строкой или HEX. Всё
            синхронизируется. Есть политика нормализации и блокировка полей.
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
          onApply={(text) => {
            try {
              const parsed = JSON.parse(text);
              BitConfigCore.buildBitLayout(parsed);
              setRawJson(text);
            } catch (e: any) {
              setError(e.message || String(e));
            }
          }}
        />

        <Composer layout={layout} width={width} />

        <Divider sx={{ my: 3 }} />
        <Box display="flex" alignItems="center" gap={1}>
          <DescriptionIcon fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            При конвертации в HEX биты группируются по 8 слева направо. Если
            длина не кратна 8 — дополняем справа нулями перед экспортом.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
