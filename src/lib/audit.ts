import { supabaseAdmin } from './supabase-admin';
import { prisma } from './db';

export async function logAuditEvent(
  actorEmail: string,
  actorRole: string,
  action: string,
  details: string,
  targetId?: string
) {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT LOG ${timestamp}] Actor: ${actorEmail} (${actorRole}) | Action: ${action} | Details: ${details}`);

  // Always write to SQLite for local development and sandbox consistency
  try {
    await prisma.auditLog.create({
      data: {
        actorEmail,
        actorRole,
        action,
        details,
        targetId: targetId || null
      }
    });
  } catch (err) {
    console.error('Failed to write audit log to SQLite:', err);
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDummy = !serviceRoleKey || serviceRoleKey.includes('dummy');

  if (!isDummy) {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_email: actorEmail,
        actor_role: actorRole,
        action,
        details,
        target_id: targetId || null,
      });
    } catch (err) {
      console.error('Failed to write audit log to Supabase PostgreSQL:', err);
    }
  }
}

