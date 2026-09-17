# INTEGRACIONES CHINA — SmartParts

Capa de conectores en `src/connectors/`. Solo se ejecutan desde `app/api/**` (ver [[ARCHITECTURE]] §6) — nunca desde el cliente.

## El contrato

Todos los conectores implementan la misma interfaz:

```js
{
  search(query, opts),        // busca candidatos por texto/código
  getProduct(productId),      // detalle de un producto
  getPricingTiers(productId), // tabla de precios por cantidad (MOQ)
  parse(rawHtmlOrJson),       // FUNCIÓN PURA — normaliza el crudo a source_listings
  healthCheck(),              // valida que la fuente sigue respondiendo como se espera
  capabilities: {
    hasOfficialApi: boolean,
    requiresProxy: boolean,
    rateLimit: { requests, perSeconds },
    tosRisk: 'low'|'medium'|'high',
  },
}
```

La pieza clave es que **`parse` es una función pura**, separada del fetch: permite testear con fixtures sin red, re-parsear todo el histórico cuando una fuente cambia su markup sin volver a scrapear, y detectar regresiones cuando la fuente cambia su HTML.

## Viabilidad real por fuente

| Fuente | API oficial | Viabilidad | Riesgo ToS | Valor para este caso |
|---|---|---|---|---|
| **AliExpress** | Sí (Open Platform) | Alta | Bajo | Medio — retail y muestras, MOQ 1 |
| **Alibaba.com** | Parcial (requiere aprobación) | Media | Medio-alto si se scrapea | **Alto** — B2B en inglés, tiers, MOQ |
| **1688.com** | No en la práctica | **Baja por vía directa** | **Alto** | **El más alto** — precio de fábrica real |
| **Made-in-China / Global Sources** | Limitada | Media-baja | Medio | Medio — descubrir fabricantes |

La tensión central: **la fuente más valiosa (1688) es la menos accesible.** Un matiz que la favorece igual: siendo Dongfeng y Neta marcas chinas, buena parte de estas piezas se fabrican para el mercado doméstico chino, y 1688 es exactamente donde están.

## Orden de implementación recomendado

1. **Importación manual (CSV/Sheets + pegar URL)** — antes que cualquier conector. Implementa el mismo contrato, hace útil el producto el día 1 con la planilla del cliente inicial, y es el fallback permanente.
2. **AliExpress** (API oficial) — valida la cadena fetch → normalizar → matchear → cotizar con riesgo bajo.
3. **Captura asistida** — un bookmarklet o extensión que el usuario ejecuta **estando logueado y navegando normalmente** en 1688/Alibaba, que extrae el JSON de la página que ya está viendo. Cualitativamente distinto del scraping automatizado: resuelve buena parte del valor de 1688 con una fracción del riesgo y del mantenimiento. **Es la recomendación fuerte de este documento.**
4. **Alibaba** vía API oficial, si aprueban la app.
5. **Scraping automatizado de 1688** solo si el volumen lo justifica — evaluando antes un agente de sourcing humano en China, que a esta escala suele ser más barato y confiable que mantener conectores.

> El scraping de estas plataformas contraviene sus términos de servicio. Es una **decisión de negocio, no técnica**: se toma con conocimiento y queda registrada acá, no oculta en el código. Un conector scrapeado además es deuda técnica permanente — se rompe sin aviso y el síntoma es "0 resultados", no un error explícito.

## Estrategia de ejecución

- **Jobs**: cada búsqueda de sourcing corre como job asíncrono desde `app/api/sourcing/*`, nunca bloqueando una request de UI.
- **Caché**: resultados de `search`/`getProduct` cacheados por un TTL corto (horas, no días — los precios en China cambian rápido) para no repetir fetch en cada vista de un mismo producto.
- **Rate limit**: respetado por conector, según `capabilities.rateLimit`. Un job que se pasa de rate limit se reintenta con backoff, no se descarta.
- **`connector_runs/`**: registra salud de cada corrida (éxito, error, cuántos resultados, cuánto tardó) — es lo que permite ver "1688 lleva 3 días sin resultados" antes de que alguien lo note manualmente.

## Chino y matching de códigos OEM

Un listado típico mezcla aplicación, nombre, calidad reclamada, código y material en un solo título. El matching usa un **score ponderado y explicable** (código exacto, variantes normalizadas, modelo de vehículo, categoría, banda de precio plausible, peso esperado) con umbrales: alto → auto-confirmado, medio → **cola de revisión humana**, bajo → descartado.

Los códigos de la planilla real ayudan y complican a la vez: los de Dongfeng (`B004163`, `4141013`) son cortos y poco distintivos, alto riesgo de falso positivo; los de Kia (`54651AO200`) son largos y específicos. El score pondera **longitud y entropía del código**, no los trata igual. Las filas `SIN CODIGO` (código `code_status: 'missing'`, ver [[MODELO-DE-DATOS]]) solo se pueden matchear por nombre + foto + vehículo, van directo a la cola humana.

Dos reglas de negocio no negociables:

- **Nunca auto-confirmar `part_type: 'original'`.** Que un vendedor escriba 原厂 no significa nada. Pasar a "verificado" requiere acción humana con foto o muestra. Todo el valor del comparador depende de que "original" signifique algo real.
- **Cada confirmación y rechazo humano se guarda.** Con 200 decisiones reales se calibran los pesos del score a mano mejor que con cualquier modelo entrenado con datos inventados.

## Estado actual

No implementado — Fase 3 del [[ROADMAP]]. Este documento fija el contrato y el orden antes de escribir el primer conector, para que la importación manual (paso 1) ya lo respete desde el día 1 y no haya que migrar datos después.
