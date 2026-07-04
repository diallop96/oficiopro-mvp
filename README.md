# OficioPro MVP

Plataforma marketplace que conecta prestadores de servicios independientes con clientes en Argentina.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Supabase** (Auth + Postgres + Storage + Realtime)
- **Vercel AI SDK** + **Grok API (xAI)** para chat y generación de contenido
- **Mercado Pago** para pago de señas

## Funcionalidades

### Prestadores
- Registro con verificación (DNI + selfie / teléfono)
- Perfil profesional con foto, descripción, zona y categorías
- Publicación de trabajos anteriores (fotos + descripción)
- Definición de servicios con precios
- Agenda de disponibilidad semanal
- Recepción y gestión de reservas
- Dashboard con turnos, ingresos y reseñas
- Generación de descripciones con IA (Grok)

### Clientes
- Búsqueda por categoría y zona
- Perfiles públicos con trabajos, reseñas y disponibilidad
- Chat interno con prestador (+ asistente IA)
- Reserva de turno + pago de seña (Mercado Pago)
- Confirmación de trabajo y reseñas verificadas

## Setup

### 1. Clonar e instalar

```bash
cd oficiopro-mvp
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completá las variables en `.env.local`:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (webhooks) |
| `NEXT_PUBLIC_APP_URL` | URL de la app (`http://localhost:3000`) |
| `XAI_API_KEY` | API key de xAI/Grok |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de Mercado Pago (opcional en dev) |

### 3. Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. Ejecutá el SQL de `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. Creá los buckets de Storage:
   - `avatars` (público)
   - `works` (público)
   - `verification` (privado)
4. Habilitá Realtime en la tabla `chat_messages`
5. Configurá la URL de callback de auth: `http://localhost:3000/auth/callback`

### 4. Ejecutar

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## Flujo de prueba end-to-end

1. **Prestador**: Registrate en `/registro/prestador` → Completá perfil → Publicá trabajos → Definí servicios y disponibilidad
2. **Cliente**: Registrate en `/registro/cliente` → Buscá en `/buscar` → Entrá al perfil → Chateá → Reservá turno
3. **Pago**: Pagá la seña (simulado sin Mercado Pago, o real con token configurado)
4. **Prestador**: Aceptá la reserva en `/dashboard/prestador/reservas`
5. **Cliente**: Confirmá el trabajo → Dejá reseña

## Estructura del proyecto

```
src/
├── app/                    # Páginas y API routes
│   ├── api/               # Chat, IA, pagos
│   ├── buscar/            # Búsqueda de prestadores
│   ├── chat/              # Mensajería
│   ├── dashboard/         # Paneles prestador y cliente
│   ├── prestador/[id]/    # Perfil público
│   └── reservar/          # Flujo de reserva
├── components/            # UI components
├── lib/                   # Supabase, IA, Mercado Pago
├── hooks/                 # React hooks
└── types/                 # TypeScript types
```

## Paleta de colores

- Azul profundo: `#0A4D68`
- Verde profesional: `#2E8B57`
- Naranja suave (CTAs): `#F4A261`
- Fondo claro: `#F8FAFB`

## Deploy en Vercel + GitHub

```bash
# 1. Configurar base de datos (en Supabase SQL Editor)
#    Ejecutar: supabase/migrations/001_initial_schema.sql

# 2. Seed de datos demo
npm run db:setup

# 3. Deploy
npx vercel --prod
```

Variables de entorno requeridas en Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (URL de producción)

## Cuentas demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Prestador (plomero) | demo.prestador@oficiopro.app | demo123456 |
| Prestador (electricista) | demo.electricista@oficiopro.app | demo123456 |
| Cliente | demo.cliente@oficiopro.app | demo123456 |

Sin Supabase configurado, la app muestra profesionales de demostración en `/buscar`.

## Licencia

MIT
