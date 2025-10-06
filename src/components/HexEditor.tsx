// src/components/HexEditor.tsx
import React, { useMemo } from "react";
import { Stack, TextField, Button, Typography } from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { BitConfigCore } from "../core/bitConfig";

type Props = {
  bitString: string;
  hexInput: string;
  setHexInput: (v: string) => void;
  setFromHex: (hex: string) => void;
};

export const HexEditor: React.FC<Props> = ({
  bitString,
  hexInput,
  setHexInput,
  setFromHex,
}) => {
  const copy = (t: string) => navigator.clipboard?.writeText(String(t));
  const hexOut = useMemo(
    () => BitConfigCore.bytesToHex(BitConfigCore.bitStringToBytes(bitString)),
    [bitString]
  );

  return (
    <Stack spacing={1}>
      <TextField
        fullWidth
        size="small"
        label="HEX (байты через пробел/без)"
        value={hexInput}
        onChange={(e) => setFromHex(e.target.value)}
        placeholder="C1 52 13 ... или C15213..."
        InputProps={{
          sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
        }}
      />
      <Stack direction="row" spacing={1}>
        <Button
          startIcon={<DataObjectIcon />}
          onClick={() => setFromHex(hexInput)}
        >
          Применить HEX
        </Button>
        <Button startIcon={<ContentCopyIcon />} onClick={() => copy(hexOut)}>
          Копировать текущий HEX
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Текущий HEX (из bitString): {hexOut}
      </Typography>
    </Stack>
  );
};
