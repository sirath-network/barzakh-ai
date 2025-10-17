import { db } from './db';
import { sql } from 'drizzle-orm';

interface ConnectionStats {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  max_connections: number;
  usage_percentage: number;
}

/**
 * Monitor database connection usage
 */
export async function getConnectionStats(): Promise<ConnectionStats | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        (SELECT count(*) FROM pg_stat_activity) as total_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections
    `);

    const row = result[0] as any;
    const stats: ConnectionStats = {
      total_connections: row.total_connections,
      active_connections: row.active_connections,
      idle_connections: row.idle_connections,
      max_connections: row.max_connections,
      usage_percentage: (row.total_connections / row.max_connections) * 100
    };

    return stats;
  } catch (error) {
    console.error('Failed to get connection stats:', error);
    return null;
  }
}

/**
 * Log connection statistics
 */
export async function logConnectionStats(): Promise<void> {
  const stats = await getConnectionStats();
  if (stats) {
    console.log('📊 Database Connection Stats:', {
      'Usage': `${stats.total_connections}/${stats.max_connections} (${stats.usage_percentage.toFixed(1)}%)`,
      'Active': stats.active_connections,
      'Idle': stats.idle_connections,
      'Status': stats.usage_percentage > 80 ? '⚠️ HIGH' : stats.usage_percentage > 60 ? '⚡ MEDIUM' : '✅ OK'
    });
  }
}

/**
 * Check if connection usage is high and log warning
 */
export async function checkConnectionHealth(): Promise<boolean> {
  const stats = await getConnectionStats();
  if (!stats) return false;

  if (stats.usage_percentage > 90) {
    console.error('🚨 CRITICAL: Database connection usage is very high!', {
      usage: `${stats.total_connections}/${stats.max_connections}`,
      percentage: `${stats.usage_percentage.toFixed(1)}%`,
      recommendation: 'Consider increasing max_connections or implementing connection pooling'
    });
    return false;
  } else if (stats.usage_percentage > 80) {
    console.warn('⚠️ WARNING: Database connection usage is high', {
      usage: `${stats.total_connections}/${stats.max_connections}`,
      percentage: `${stats.usage_percentage.toFixed(1)}%`
    });
  }

  return true;
}

/**
 * Kill idle connections (use with caution)
 */
export async function killIdleConnections(idleTimeMinutes: number = 30): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity 
      WHERE state = 'idle' 
        AND state_change < NOW() - INTERVAL '${sql.raw(idleTimeMinutes.toString())} minutes'
        AND pid <> pg_backend_pid()
    `);

    const killedCount = result.length;
    if (killedCount > 0) {
      console.log(`🧹 Killed ${killedCount} idle connections older than ${idleTimeMinutes} minutes`);
    }
    
    return killedCount;
  } catch (error) {
    console.error('Failed to kill idle connections:', error);
    return 0;
  }
}

/**
 * Start periodic connection monitoring (for development)
 */
export function startConnectionMonitoring(intervalMinutes: number = 5): NodeJS.Timeout | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  console.log(`🔍 Starting connection monitoring (every ${intervalMinutes} minutes)`);
  
  return setInterval(async () => {
    await checkConnectionHealth();
  }, intervalMinutes * 60 * 1000);
}
