import { Suspense } from 'react'
import PartDetailPage from '@features/parts/PartDetailPage'

// Solo en la compilación del sitio estático (`build:hosting`): una página compartida por todas
// las fichas, con el id leído de la URL. En desarrollo no se define: hacer que el servidor
// calcule rutas estáticas rompe la compilación en caliente.
export const generateStaticParams =
  process.env.NEXT_OUTPUT === 'export' ? () => [{ id: '_' }] : undefined

export default function Page() {
  return (
    <Suspense>
      <PartDetailPage />
    </Suspense>
  )
}
