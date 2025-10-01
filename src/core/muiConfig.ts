import { createTheme, ThemeOptions } from "@mui/material";

export const OUTER_THEME: ThemeOptions = createTheme({
  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "system-ui",
      "Arial",
      "sans-serif",
    ].join(","),
  },
  colorSchemes: {
    light: true,
    dark: true,
  },
});
