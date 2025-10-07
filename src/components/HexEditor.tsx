// src/components/HexEditor.tsx
import React from "react";
import { Stack, TextField, Typography } from "@mui/material";
import { BitConfigCore } from "../core/bitConfig";

type Props = {
  bitString: string;
  hexInput: string;
  setHexInput: (v: string) => void;
  setBitString: (bit: string) => void;
  setError: (error: string) => void;
  notify: (toast: string) => void;
};

export const HexEditor: React.FC<Props> = ({
  hexInput,
  setHexInput,
  setBitString,
  setError,
  notify,
}) => {
  const handleChange = (hex: string) => {
    setError("");
    setHexInput(hex);
    try {
      const bytes = BitConfigCore.hexToBytes(hex);
      const raw = BitConfigCore.bytesToBitString(bytes);
      setBitString(raw);
    } catch (e) {
    }
  };

  const handleBlur = (hex: string) => {
    if (hex) notify("HEX применён");
    setHexInput(hex);
    try {
      const bytes = BitConfigCore.hexToBytes(hex);
      const raw = BitConfigCore.bytesToBitString(bytes);
      setBitString(raw);
    } catch (e) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? (e as any).message
          : String(e);
      setError(msg);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="h6" sx={{ fontSize: { xs: 18, md: 20 } }}>
        Введите текущую конфигурацию
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="HEX (байты через пробел/без)"
        value={hexInput}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="C1 52 13 ... или C15213..."
        onBlur={(e) => handleBlur(e.target.value)}
        InputProps={{
          sx: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
        }}
      />
    </Stack>
  );
};
