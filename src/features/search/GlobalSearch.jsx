'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import { useOrders } from '@features/orders/hooks/useOrders'
import { SEARCH_MAX_WIDTH } from '@constants/layout'
import { buildSearchItems, searchItems } from './searchModel'

/**
 * Carga los datos recién cuando se usa el buscador y los entrega ya indexados.
 * Es un componente aparte porque `useOrders` lee de Firestore al montarse, y no
 * corresponde hacerlo en cada pantalla si nadie busca.
 */
function SearchIndexLoader({ onItems }) {
  const { loading, parts, suppliers, clients, clientOrderRows, purchaseOrderRows } = useOrders()
  const items = useMemo(
    () =>
      loading
        ? null
        : buildSearchItems({ parts, suppliers, clients, clientOrderRows, purchaseOrderRows }),
    [loading, parts, suppliers, clients, clientOrderRows, purchaseOrderRows],
  )
  useEffect(() => {
    onItems(items)
  }, [items, onItems])
  return null
}

/** Buscador global de la barra superior: repuestos, proveedores, clientes y órdenes. */
export default function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef(null)
  const [activated, setActivated] = useState(false)
  const [items, setItems] = useState(null)
  const [query, setQuery] = useState('')

  // Atajo "/" para enfocar el buscador, salvo que ya se esté escribiendo en un campo.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const options = useMemo(() => (items ? searchItems(items, query) : []), [items, query])
  const noOptionsText =
    activated && items === null
      ? 'Cargando…'
      : query.trim()
        ? 'Sin resultados'
        : 'Escribe para buscar'

  return (
    <>
      {activated ? <SearchIndexLoader onItems={setItems} /> : null}
      <Autocomplete
        fullWidth
        size="small"
        options={options}
        filterOptions={(all) => all}
        groupBy={(o) => o.group}
        getOptionLabel={(o) => o.label ?? ''}
        isOptionEqualToValue={(a, b) => a.key === b.key}
        inputValue={query}
        onInputChange={(_, value, reason) => {
          if (reason !== 'reset') setQuery(value)
        }}
        value={null}
        onChange={(_, option) => {
          if (!option) return
          setQuery('')
          inputRef.current?.blur()
          router.push(option.href)
        }}
        onFocus={() => setActivated(true)}
        noOptionsText={noOptionsText}
        renderOption={({ key, ...props }, option) => (
          <Box component="li" key={key} {...props}>
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {option.label}
            </Typography>
            {option.detail ? (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ ml: 2 }}>
                {option.detail}
              </Typography>
            ) : null}
          </Box>
        )}
        sx={{ maxWidth: SEARCH_MAX_WIDTH }}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={inputRef}
            placeholder="Buscar repuestos, proveedores, clientes y órdenes (/)"
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps?.input,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.65)' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 40,
                borderRadius: 2,
                color: 'common.white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                '&.Mui-focused fieldset': { borderColor: 'secondary.main' },
              },
              '& input::placeholder': { color: 'rgba(255,255,255,0.65)', opacity: 1 },
            }}
          />
        )}
      />
    </>
  )
}
