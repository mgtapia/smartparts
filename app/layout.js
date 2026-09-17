import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import { Inter } from 'next/font/google'
import Providers from '@/providers'

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'SmartParts',
  description: 'Importación y reventa de repuestos de vehículos eléctricos — China → Chile.',
  icons: { icon: '/assets/brand/favicon-smartdeal.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={body.variable}>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="light" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
