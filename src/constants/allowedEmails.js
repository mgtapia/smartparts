// Allowlist de acceso — por ahora el proyecto es privado al equipo interno,
// no hay roles/custom claims todavía (ver .agent/STATUS.md §Bloqueos), así
// que esto es lo único que impide que cualquier cuenta de Google entre.
// Mantener sincronizado a mano con la lista de `firestore.rules` (las Security
// Rules no pueden importar este archivo).
export const ALLOWED_EMAILS = Object.freeze(['matiastapia91@gmail.com', 'dmezastange@gmail.com'])
