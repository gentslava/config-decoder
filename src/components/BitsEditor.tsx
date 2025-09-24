// src/components/BitsEditor.tsx
import React from "react";
import { Stack, TextField, Button } from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";

type Props = {
  width: number;
  rawBits: string;
  setRawBits: (v: string) => void;
  applyBits: () => void;
  onApplied?: () => void;
};

export const BitsEditor: React.FC<Props> = ({
  width,
  rawBits,
  setRawBits,
  applyBits,
  onApplied,
}) => (
  <Stack spacing={1}>
    <TextField
      fullWidth
      size="small"
      label={`BIT (любой длины; width=${width})`}
      value={rawBits}
      onChange={(e) => setRawBits(e.target.value.replace(/[^01]/g, ""))}
      placeholder="Например: 1010011"
      InputProps={{
        sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
      }}
    />
    <Stack direction="row" spacing={1}>
      <Button
        startIcon={<DataObjectIcon />}
        onClick={() => {
          applyBits();
          onApplied?.();
        }}
      >
        Применить BIT
      </Button>
    </Stack>
  </Stack>
);
