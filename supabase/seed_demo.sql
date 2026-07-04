-- Datos demo para OficioPro (ejecutar después de la migración y crear usuarios en auth)
-- Los UUIDs deben coincidir con auth.users si se crean vía dashboard

-- Habilitar Realtime para chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;