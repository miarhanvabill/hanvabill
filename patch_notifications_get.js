const fs = require('fs');
let content = fs.readFileSync('app/api/notifications/route.ts', 'utf8');

content = content.replace(
  /const rows = await sql\`([\s\S]*?)WHERE wal.tenant_id = \$\{tenantId\}::text([\s\S]*?)UNION ALL([\s\S]*?)WHERE b.tenant_id = \$\{tenantId\}([\s\S]*?)LIMIT 20\s*\`/m,
  `const rows = await sql\`
        SELECT 
          wal.id,
          wal.event_type as type,
          COALESCE(
            CASE 
              WHEN wal.event_type = 'invoice_receipt' THEN '🧾 Invoice sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'loyalty_update' THEN '⭐ Loyalty points updated for ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'booking_created' THEN '📅 Booking confirmation sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'appointment_reminder_24h' THEN '⏰ 24h reminder sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'appointment_reminder_2h' THEN '⏰ 2h reminder sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'birthday_greeting' THEN '🎂 Birthday wish sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'anniversary_greeting' THEN '🎉 Anniversary wish sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'we_miss_you' THEN '💌 Win-back message sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              ELSE wal.event_type || ' sent to ' || COALESCE(c.full_name, wal.recipient_phone)
            END,
            wal.message_content
          ) as message,
          wal.status,
          false as is_read,
          wal.sent_at as created_at,
          c.full_name as customer_name,
          wal.recipient_phone,
          'wa' as source_type
        FROM whatsapp_automation_logs wal
        LEFT JOIN customers c ON wal.customer_id = c.id AND c.tenant_id = \${tenantId}
        LEFT JOIN notification_dismissals nd ON nd.tenant_id = \${tenantId} AND nd.item_type = 'wa' AND nd.item_id = wal.id::text
        WHERE wal.tenant_id = \${tenantId}::text AND nd.dismissed_at IS NULL
        $2UNION ALL$3
          false as is_read,
          b.created_at,
          c.full_name as customer_name,
          c.phone_number as recipient_phone,
          'booking' as source_type
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = \${tenantId}
        LEFT JOIN notification_dismissals nd ON nd.tenant_id = \${tenantId} AND nd.item_type = 'booking' AND nd.item_id = b.id::text
        WHERE b.tenant_id = \${tenantId} AND nd.dismissed_at IS NULL
        $4LIMIT 20\``
);

fs.writeFileSync('app/api/notifications/route.ts', content);
