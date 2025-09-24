// src/components/MobileDock.tsx
import React, { useState } from "react";
import {
  Paper,
  Stack,
  IconButton,
  Typography,
  Tooltip,
  Snackbar,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ConstructionIcon from "@mui/icons-material/Construction";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type Props = {
  onUpload: () => void;
  onApply: () => void;
  onCopyHex: () => void;
  disabledCopy?: boolean;
};

const MobileDock: React.FC<Props> = ({
  onUpload,
  onApply,
  onCopyHex,
  disabledCopy,
}) => {
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: "",
  });
  const notify = (msg: string) => setToast({ open: true, msg });
  const close = () => setToast((s) => ({ ...s, open: false }));

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          display: { xs: "block", md: "none" },
          pb: "env(safe-area-inset-bottom)",
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-around"
          sx={{ py: 0.5 }}
        >
          <Tooltip title="Загрузить JSON">
            <Stack alignItems="center" spacing={0}>
              <IconButton
                size="small"
                onClick={() => {
                  onUpload();
                  notify("Файл выбран (если был)");
                }}
              >
                <UploadFileIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">Загрузить</Typography>
            </Stack>
          </Tooltip>

          <Tooltip title="Применить конфиг">
            <Stack alignItems="center" spacing={0}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  onApply();
                  notify("Конфигурация применена");
                }}
              >
                <ConstructionIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">Применить</Typography>
            </Stack>
          </Tooltip>

          <Tooltip title="Копировать HEX текущего буфера">
            <Stack
              alignItems="center"
              spacing={0}
              sx={{ opacity: disabledCopy ? 0.5 : 1 }}
            >
              <IconButton
                size="small"
                onClick={() => {
                  if (!disabledCopy) {
                    onCopyHex();
                    notify("Скопировано");
                  }
                }}
                disabled={disabledCopy}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">HEX</Typography>
            </Stack>
          </Tooltip>
        </Stack>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={1500}
        onClose={close}
        message={toast.msg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default MobileDock;
