import Link from 'next/link'

/** Vehículos como enlaces a su ficha, separados por coma. `vehicles`: `[{ id, label }]`. */
export default function VehicleLinks({ vehicles }) {
  if (vehicles.length === 0) return '—'
  return vehicles.map((v, i) => (
    <span key={v.id}>
      {i > 0 ? ', ' : ''}
      <Link href={`/vehicles/${v.id}`} style={{ color: 'inherit' }}>
        {v.label}
      </Link>
    </span>
  ))
}
