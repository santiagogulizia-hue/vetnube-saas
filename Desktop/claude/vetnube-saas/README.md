# VetNube SaaS

Gestión integral para veterinarias: Next.js (App Router) + Tailwind CSS + Supabase.

## Puesta en marcha

1. Instalá [Node.js 20 LTS o superior](https://nodejs.org).
2. Copiá `.env.example` como `.env.local` y completá la URL y la `anon key` de Supabase
   (Project Settings → API).
3. En Supabase → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`
4. Instalá dependencias y levantá el servidor:

   ```bash
   npm install
   npm run dev
   ```

5. Abrí http://localhost:3000, creá tu cuenta y dá de alta la clínica.

## Estructura

```
supabase/migrations/        Esquema SQL (Fase 1)
src/middleware.ts           Protege rutas y refresca la sesión
src/lib/                    Supabase, sesión/clínica, formatos, etiquetas y tipos
src/components/layout/      Sidebar, Topbar y AppShell
src/components/dashboard/   Tarjetas y listas del inicio
src/components/ui/          Piezas reutilizables (Card, badges, avatar)
src/app/login               Ingreso y registro
src/app/onboarding          Alta de la clínica
src/app/(clinic)/           Pantallas con menú lateral (dashboard, agenda, …)
```

## Migraciones de base de datos (en orden)

Ejecutar en Supabase → SQL Editor, cada una **una sola vez**:

1. `supabase/migrations/20261011000000_init.sql` — esquema base, RLS, funciones de ventas y stock.
2. `supabase/migrations/20261012000000_reports_and_team.sql` — costo histórico por venta, `sales_report`, `clinic_team` e `invitation_preview`.
3. `supabase/migrations/20261013000000_billing.sql` — suscripción de cada clínica (prueba de 14 días + Mercado Pago) e historial de facturación.

Si un script falla a mitad de camino, `supabase/reset_fase1.sql` limpia la Fase 1 (borra datos).
