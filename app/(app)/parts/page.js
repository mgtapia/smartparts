import { redirect } from 'next/navigation'

// "Repuestos" en el rail apunta al browse — el catálogo transversal (/catalog).
// La ficha individual vive en /parts/[id] (ver src/features/parts/PartDetailPage.jsx).
export default function PartsPage() {
  redirect('/catalog')
}
