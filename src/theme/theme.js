'use client'

import { createTheme } from '@mui/material/styles'
import { COLORS, RADIUS, FONT_BODY, FONT_DISPLAY, FONT_MONO } from '@constants/colors'

// Paleta de marca — modo CLARO. Fondos claros/cálidos, chrome oscuro (rail/header)
// invariante entre modos — ver .agent/DESIGN.md.
const brandLight = {
  bodyBg: COLORS.bgAlt,
  contentBg: COLORS.bg,
  paper: COLORS.bg,
  paperWarm: COLORS.bgWarm,
  border: COLORS.border,
  borderAlt: COLORS.borderAlt,
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  ink: COLORS.ink,
  railBg: COLORS.chrome, // negro puro — el verde de marca en un panel grande se leía como musgo
  lime: COLORS.lime,
  limeInk: COLORS.limeInk,
  amber: COLORS.amber,
  mutedGreen: COLORS.mutedGreen,
}

// Paleta de marca — modo OSCURO. Superficies oscuras (ya casi-negras en la marca
// real), texto claro, acentos preservados.
const brandDark = {
  bodyBg: COLORS.inkAlt2,
  contentBg: COLORS.inkAlt,
  paper: COLORS.surfaceDarkAlt,
  paperWarm: COLORS.surfaceDarkAlt2,
  border: '#2a332f',
  borderAlt: '#333d38',
  textPrimary: '#EDEFE9',
  textSecondary: '#B9C2B4',
  ink: COLORS.ink,
  railBg: COLORS.chrome,
  lime: COLORS.lime,
  limeInk: COLORS.limeInk,
  amber: COLORS.amber,
  mutedGreen: COLORS.mutedGreenAlt,
}

const paletteLight = {
  primary: { main: COLORS.ink, contrastText: COLORS.lime },
  secondary: { main: COLORS.lime, contrastText: COLORS.limeInk },
  background: { default: brandLight.bodyBg, paper: brandLight.paper },
  text: { primary: brandLight.textPrimary, secondary: brandLight.textSecondary },
  divider: brandLight.border,
  brand: brandLight,
}

const paletteDark = {
  primary: { main: COLORS.lime, contrastText: COLORS.limeInk },
  secondary: { main: COLORS.amber, contrastText: COLORS.ink },
  background: { default: brandDark.bodyBg, paper: brandDark.paper },
  text: { primary: brandDark.textPrimary, secondary: brandDark.textSecondary },
  divider: brandDark.border,
  brand: brandDark,
}

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        ...paletteLight,
        success: { main: COLORS.success },
        warning: { main: COLORS.warning },
        error: { main: COLORS.error },
        info: { main: COLORS.mutedGreen },
      },
    },
    dark: {
      palette: {
        mode: 'dark',
        ...paletteDark,
        success: { main: COLORS.success },
        warning: { main: COLORS.warning },
        error: { main: COLORS.error },
        info: { main: COLORS.mutedGreenAlt },
      },
    },
  },
  shape: { borderRadius: RADIUS.input },
  typography: {
    fontFamily: FONT_BODY,
    h1: { fontFamily: FONT_DISPLAY, fontWeight: 800 },
    h2: { fontFamily: FONT_DISPLAY, fontWeight: 800 },
    h3: { fontFamily: FONT_DISPLAY, fontWeight: 700 },
    h4: { fontFamily: FONT_DISPLAY, fontWeight: 700 },
    h5: { fontFamily: FONT_DISPLAY, fontWeight: 700 },
    h6: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
    overline: {
      fontFamily: FONT_MONO,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontSize: '11px',
    },
    caption: { fontFamily: FONT_MONO, fontSize: '11px' },
    button: { textTransform: 'none', fontWeight: 600 },
    fontSize: 13,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        'html, body': { backgroundColor: theme.palette.brand.bodyBg },
      }),
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent' },
      styleOverrides: {
        root: { backgroundColor: COLORS.chrome, color: '#FFFFFF' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: COLORS.chrome, border: 'none', color: '#FFFFFF' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: RADIUS.input, paddingTop: 8, paddingBottom: 8 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.brand.paper,
          border: `1px solid ${theme.palette.brand.border}`,
          borderRadius: RADIUS.card,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: RADIUS.pill, fontFamily: FONT_MONO, fontSize: 11 },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.brand.border}`,
          borderRadius: RADIUS.card,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
})

export default theme
