'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import Pill from '@components/common/Pill'

const SEVERITY_TONE = { alta: 'error', media: 'warning' }

/** Agrupa las anomalías que dicen lo mismo, con las más graves y numerosas primero. */
function groupAnomalies(anomalies) {
  const groups = new Map()
  for (const a of anomalies) {
    const key = `${a.code}|${a.titleEs.replace(/\d+/g, 'N')}`
    if (!groups.has(key)) groups.set(key, { key, first: a, items: [] })
    groups.get(key).items.push(a)
  }
  const weight = (g) => (g.first.severity === 'alta' ? 0 : 1)
  return [...groups.values()].sort(
    (x, y) => weight(x) - weight(y) || y.items.length - x.items.length,
  )
}

function Group({ group, abbrOf }) {
  const [open, setOpen] = useState(false)
  const { first, items } = group
  const many = items.length > 1
  const who = (a) =>
    [a.partName, a.supplierId ? abbrOf(a.supplierId) : '', a.quality].filter(Boolean).join(' · ')

  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Pill label={first.severity} tone={SEVERITY_TONE[first.severity]} />
        <Pill label={first.area} />
        <Typography variant="body2">
          {many ? first.titleEs.replace(/\d+/, 'N') : first.titleEs}
          {many ? ` · ${items.length}` : ''}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        <b>Qué hacer:</b> {first.actionEs}
      </Typography>
      {many ? (
        <>
          <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ mt: 0.5, ml: -1 }}>
            {open ? 'Ocultar' : `Ver los ${items.length}`}
          </Button>
          <Collapse in={open}>
            <Box
              component="ul"
              sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}
            >
              {items.map((a, i) => (
                <Typography key={i} component="li" variant="body2" color="text.secondary">
                  {who(a) ? <b>{who(a)}: </b> : null}
                  {a.detailEs}
                </Typography>
              ))}
            </Box>
          </Collapse>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {who(first) ? <b>{who(first)}: </b> : null}
          {first.detailEs}
        </Typography>
      )}
    </Card>
  )
}

/**
 * @param {Object} props
 * @param {any[]} props.anomalies
 * @param {{ id: string, abbr: string }[]} props.suppliers
 */
export default function AnomalyGroups({ anomalies, suppliers }) {
  const abbrOf = (id) => suppliers.find((s) => s.id === id)?.abbr ?? ''
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {groupAnomalies(anomalies).map((g) => (
        <Group key={g.key} group={g} abbrOf={abbrOf} />
      ))}
    </Box>
  )
}
