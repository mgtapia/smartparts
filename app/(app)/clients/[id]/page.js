import { Suspense } from 'react'
import ClientDetailPage from '@features/clients/ClientDetailPage'

// Solo en la compilación del sitio estático (`build:hosting`): una página compartida por todas
// las fichas, con el id leído de la URL. En desarrollo no se define: hacer que el servidor
// calcule rutas estáticas rompe la compilación en caliente.
export const generateStaticParams =
  process.env.NEXT_OUTPUT === 'export' ? () => [{ id: '_' }] : undefined

export default function Page() {
  return (
    <Suspense>
      <ClientDetailPage />
    </Suspense>
  )
}
