import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

export function LoadingState() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

export function ErrorState({ message = 'No se pudo cargar la información desde Firestore.' }) {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="body2" color="error.main">
        {message}
      </Typography>
    </Box>
  )
}
