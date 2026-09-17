# SEGURIDAD Y ROLES — SmartParts

## Roles (custom claims de Firebase Auth)

| Rol | Claim | Descripción |
|---|---|---|
| Admin | `role: 'admin'` | Acceso total, incluye `settings` (parámetros aduaneros, roles de usuario). |
| Comprador | `role: 'buyer'` | Operación diaria: catálogo, cotizaciones, sourcing, costeo, embarques. |
| Consulta | `role: 'viewer'` | Solo lectura de catálogo, dashboard, estado de embarques. |

Permiso adicional, independiente del rol base: `canViewMargin: boolean` — habilita ver `pricing` (margen y precio de venta). Por defecto solo `admin` lo tiene; se puede otorgar a un `buyer` puntual sin subirlo a admin.

## Matriz de permisos

| Módulo | Admin | Comprador | Consulta |
|---|:-:|:-:|:-:|
| `dashboard` | ✅ | ✅ | ✅ |
| `vehicles` / `catalog` / `parts` | ✅ | ✅ | 👁️ solo lectura |
| `suppliers` / `quotes` / `sourcing` | ✅ | ✅ | 👁️ solo lectura |
| `costing` | ✅ | ✅ | 👁️ solo lectura, sin guardar escenarios |
| `shipments` | ✅ | ✅ | 👁️ solo lectura |
| `clients` | ✅ | ✅ | 👁️ solo lectura |
| `pricing` (margen) | ✅ | Solo si `canViewMargin` | ❌ |
| `imports` | ✅ | ✅ | ❌ |
| `settings` (parámetros, roles) | ✅ | ❌ | ❌ |

## Firestore Security Rules — principios

- **Nada se confía al cliente.** El rol se lee del custom claim del token (`request.auth.token.role`), nunca de un campo editable en `users/{uid}`.
- **Escrituras privilegiadas van por `app/api/**`** con `firebase-admin`, no directo desde el cliente: parámetros aduaneros (`cost_param_sets`), asignación de roles, tipos de cambio (`fx_rates`, alimentados por un job, no por el usuario).
- **`pricing`/margen**: las reglas de Firestore bloquean la lectura de campos de margen/precio de venta para quien no tenga `canViewMargin`, no solo la UI — un `viewer` con las devtools abiertas no debe poder leer el campo igual.
- **Inmutabilidad**: `cost_param_sets/{id}` y los `_snapshot` dentro de `shipments/{id}/lines` son de solo lectura una vez creados — las reglas rechazan cualquier `update` sobre esos documentos, solo permiten `create`.

## Qué se valida en el servidor (no solo en el cliente)

- Toda escritura de dinero: que `amount` sea entero, que `currency`/`scale` sean consistentes (espejo de la validación de `src/libs/money.js`, pero corrida server-side vía Cloud Functions o en el route handler antes de escribir).
- Toda escritura a `cost_param_sets`: que el `id` nuevo no colisione con uno existente (inmutabilidad).
- Todo cambio de rol: solo `admin` puede escribirlo, y queda en `audit_log/`.

## Auditoría

`audit_log/{id}` registra: quién, qué documento, qué cambió (antes/después de campos sensibles), cuándo. Obligatorio para: cambios de rol, cambios de `cost_param_sets`, confirmaciones de `part_type: 'original'` (ver [[INTEGRACIONES-CHINA]] §Chino y matching — es la trazabilidad que permite calibrar el score de matching más adelante).

## Estado actual

No implementado — Fase 2 del [[ROADMAP]] (junto con Firestore real y el importador). Este documento fija la matriz de permisos antes de escribir las Security Rules, para diseñar el modelo de datos de `users/` compatible desde Fase 1.
