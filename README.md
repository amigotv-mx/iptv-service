# IPTV Simulator

Software para transmitir videos en loop como canales de TV con EPG y gestión de canales.

## Requisitos
- Node.js v18+
- PostgreSQL

## Instalación

1. Clona o descarga este repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura tu base de datos PostgreSQL y añade la URL en una variable de entorno `DATABASE_URL`.
4. Sincroniza la base de datos:
   ```bash
   npm run db:push
   ```
5. Inicia la aplicación:
   ```bash
   npm run dev
   ```

## Uso
- Accede a la URL principal para ver la televisión.
- Haz clic en el icono de ajustes o ve a `/admin` para gestionar canales y videos.
- Usa URLs directas (.mp4) para una experiencia sin anuncios.
