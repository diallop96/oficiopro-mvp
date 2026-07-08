-- OficioPro: consultas de mantenimiento
-- Ejecutar en Supabase → SQL Editor

-- 1. Ver resumen de la plataforma
SELECT 'profiles' AS tabla, COUNT(*) AS total FROM profiles
UNION ALL SELECT 'provider_profiles', COUNT(*) FROM provider_profiles
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'works', COUNT(*) FROM works
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages;

-- 2. Reservas por estado
SELECT status, COUNT(*) AS cantidad, SUM(deposit_amount) AS total_señas
FROM bookings
GROUP BY status
ORDER BY cantidad DESC;

-- 3. Prestadores pendientes de verificación
SELECT p.full_name, p.email, p.verification_status, p.created_at
FROM profiles p
WHERE p.role = 'prestador' AND p.verification_status = 'pendiente'
ORDER BY p.created_at DESC;

-- 4. Verificar un prestador manualmente
-- UPDATE profiles SET verification_status = 'verificado' WHERE email = 'email@ejemplo.com';
-- UPDATE provider_profiles SET is_verified = true
-- WHERE user_id = (SELECT id FROM profiles WHERE email = 'email@ejemplo.com');

-- 5. Limpiar reservas canceladas antiguas (más de 90 días)
-- DELETE FROM bookings
-- WHERE status = 'cancelada' AND created_at < NOW() - INTERVAL '90 days';

-- 6. Recalcular rating de un prestador
-- UPDATE provider_profiles pp SET
--   average_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE provider_id = pp.id),
--   total_reviews = (SELECT COUNT(*) FROM reviews WHERE provider_id = pp.id)
-- WHERE id = 'UUID_DEL_PRESTADOR';
