import React from "react";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import {
  Box,
  IconButton,
  Popover,
  Tooltip,
  Typography,
  useColorScheme,
} from "@mui/material";

const ThemeToggle: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { mode, setMode } = useColorScheme();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);

  // Выбор иконки для основной кнопки
  const getIcon = () => {
    if (mode === "light") return <LightModeOutlinedIcon />;
    if (mode === "dark") return <DarkModeOutlinedIcon />;
    return <SettingsBrightnessRoundedIcon />;
  };

  return (
    <>
      <Tooltip title="Выбрать тему">
        <IconButton onClick={handleOpen} color="inherit">
          {getIcon()}
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "center", horizontal: "left" }}
        transformOrigin={{ vertical: "center", horizontal: "right" }}
        sx={{ zIndex: 1300 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 3,
            borderRadius: 4,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 2 }}>
            Тема
          </Typography>
          <Tooltip title="Светлая" arrow>
            <IconButton
              sx={{
                mx: 1,
                bgcolor: mode === "light" ? "action.selected" : undefined,
                color: "inherit",
                borderRadius: 2,
                px: 3,
                py: 2,
                transition: "background 0.2s",
              }}
              onClick={() => {
                setMode("light");
                handleClose();
              }}
            >
              <LightModeOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Системная" arrow>
            <IconButton
              sx={{
                mx: 1,
                bgcolor: mode === "system" ? "action.selected" : undefined,
                color: "inherit",
                borderRadius: 2,
                px: 3,
                py: 2,
                transition: "background 0.2s",
              }}
              onClick={() => {
                setMode("system");
                handleClose();
              }}
            >
              <SettingsBrightnessRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Тёмная" arrow>
            <IconButton
              sx={{
                mx: 1,
                bgcolor: mode === "dark" ? "action.selected" : undefined,
                color: "inherit",
                borderRadius: 2,
                px: 3,
                py: 2,
                transition: "background 0.2s",
              }}
              onClick={() => {
                setMode("dark");
                handleClose();
              }}
            >
              <DarkModeOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Popover>
    </>
  );
};

export default ThemeToggle;
