'use client'

import { usePathname, useRouter } from 'next/navigation'
import ViewTabs from '@components/common/ViewTabs'
import { findNavTrail } from '@constants/routes'

/**
 * Pestañas de los módulos de una sección del menú (Catálogo → Repuestos /
 * Vehículos). El menú lateral solo lleva a la sección; el cambio entre sus
 * módulos se hace acá. Van en la misma fila que el título (PageHeader). Sin sección o con un solo módulo no muestra nada.
 */
export default function SectionTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const trail = findNavTrail(pathname)
  if (!trail || trail.siblings.length < 2) return null

  return (
    <ViewTabs
      value={trail.item.key}
      onChange={(key) => router.push(trail.siblings.find((s) => s.key === key).path)}
      sx={{ mb: 0 }}
      tabs={trail.siblings.map((s) => ({ value: s.key, label: s.labelEs }))}
    />
  )
}
