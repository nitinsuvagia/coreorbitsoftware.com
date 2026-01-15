import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

// Backup storage directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface BackupRecord {
  id: string;
  filename: string;
  size: string;
  createdAt: Date;
  type: 'manual' | 'scheduled';
  destination: 'local' | 's3';
  status: 'completed' | 'failed' | 'in_progress';
  s3Key?: string;
}

interface BackupSettings {
  scheduleEnabled: boolean;
  scheduleFrequency: 'daily' | 'weekly' | 'monthly';
  scheduleTime: string;
  scheduleDayOfWeek: number;
  scheduleDayOfMonth: number;
  s3Enabled: boolean;
  retentionDays: number;
}

// In-memory storage for backup records (in production, use database)
let backupRecords: BackupRecord[] = [];
let backupSettings: BackupSettings = {
  scheduleEnabled: false,
  scheduleFrequency: 'daily',
  scheduleTime: '02:00',
  scheduleDayOfWeek: 0,
  scheduleDayOfMonth: 1,
  s3Enabled: false,
  retentionDays: 30,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function createBackup(
  destination: 'local' | 's3' = 'local',
  type: 'manual' | 'scheduled' = 'manual',
  awsConfig?: { accessKeyId: string; secretAccessKey: string; region: string; s3Bucket: string }
): Promise<BackupRecord> {
  const backupId = `backup_${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `oms_backup_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  const record: BackupRecord = {
    id: backupId,
    filename,
    size: '0 B',
    createdAt: new Date(),
    type,
    destination,
    status: 'in_progress',
  };

  backupRecords.unshift(record);

  try {
    // Get database connection info from environment
    // Use MASTER_DATABASE_URL which is the standard env var in this project
    const dbUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '';
    
    // Support both formats: with and without password
    // postgresql://user:password@host:port/database
    // postgresql://user@host:port/database
    let urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
    
    if (!urlMatch) {
      // Try format without explicit port (default 5432)
      urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+)\/([^?]+)/);
      if (urlMatch) {
        // Insert default port
        urlMatch = [urlMatch[0], urlMatch[1], urlMatch[2], urlMatch[3], '5432', urlMatch[4]];
      }
    }
    
    if (!urlMatch) {
      logger.error({ dbUrl: dbUrl.substring(0, 30) + '...' }, 'Invalid database URL format');
      throw new Error('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database');
    }

    const [, user, password, host, port, database] = urlMatch;

    // Run pg_dump using Docker to avoid version mismatch
    logger.info({ backupId, destination }, 'Starting database backup');
    
    // Use docker exec to run pg_dump inside the container (avoids version mismatch)
    // The container name is 'oms-postgres' as defined in docker-compose
    const containerName = process.env.POSTGRES_CONTAINER || 'oms-postgres';
    const isDocker = process.env.USE_DOCKER_PGDUMP !== 'false'; // Default to using Docker
    
    let pgDumpCommand: string;
    
    if (isDocker) {
      // Run pg_dump inside the Docker container and output to stdout, then redirect to file
      pgDumpCommand = `docker exec ${containerName} pg_dump -U ${user} -d ${database} -F p > "${filePath}"`;
    } else {
      // Fallback to local pg_dump if explicitly disabled
      pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${filePath}"`;
    }
    
    await execAsync(pgDumpCommand);

    // Get file size
    const stats = fs.statSync(filePath);
    record.size = formatBytes(stats.size);

    // Upload to S3 if destination is s3
    if (destination === 's3' && awsConfig) {
      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: {
          accessKeyId: awsConfig.accessKeyId,
          secretAccessKey: awsConfig.secretAccessKey,
        },
      });

      const s3Key = `backups/${filename}`;
      const fileContent = fs.readFileSync(filePath);

      await s3Client.send(new PutObjectCommand({
        Bucket: awsConfig.s3Bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'application/sql',
      }));

      record.s3Key = s3Key;
      record.destination = 's3';

      // Delete local file after S3 upload
      fs.unlinkSync(filePath);
      
      logger.info({ backupId, s3Key }, 'Backup uploaded to S3');
    }

    record.status = 'completed';
    logger.info({ backupId, filename, size: record.size }, 'Backup completed successfully');

    return record;
  } catch (error: any) {
    logger.error({ error, backupId }, 'Backup failed');
    record.status = 'failed';
    
    // Clean up failed backup file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw error;
  }
}

export function getBackupHistory(): BackupRecord[] {
  // Also check local backup directory for any files
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const localBackups = files
      .filter(f => f.endsWith('.sql'))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        const existingRecord = backupRecords.find(r => r.filename === filename);
        
        if (existingRecord) return null;

        return {
          id: `local_${filename}`,
          filename,
          size: formatBytes(stats.size),
          createdAt: stats.mtime,
          type: 'manual' as const,
          destination: 'local' as const,
          status: 'completed' as const,
        };
      })
      .filter(Boolean) as BackupRecord[];

    // Merge with in-memory records
    const allRecords = [...backupRecords, ...localBackups];
    
    // Sort by date descending
    return allRecords.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 50); // Limit to 50 records
  } catch (error) {
    return backupRecords;
  }
}

export function getBackupSettings(): BackupSettings {
  return backupSettings;
}

export function updateBackupSettings(settings: Partial<BackupSettings>): BackupSettings {
  backupSettings = { ...backupSettings, ...settings };
  return backupSettings;
}

export async function getBackupDownloadUrl(
  backupId: string,
  awsConfig?: { accessKeyId: string; secretAccessKey: string; region: string; s3Bucket: string }
): Promise<string> {
  const record = backupRecords.find(r => r.id === backupId);
  
  if (!record) {
    // Check if it's a local file ID
    if (backupId.startsWith('local_')) {
      const filename = backupId.replace('local_', '');
      const filePath = path.join(BACKUP_DIR, filename);
      
      if (fs.existsSync(filePath)) {
        // Return a local download endpoint
        return `/api/v1/platform/settings/maintenance/backups/download-file/${filename}`;
      }
    }
    throw new Error('Backup not found');
  }

  if (record.destination === 's3' && record.s3Key && awsConfig) {
    const s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });

    const command = new GetObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: record.s3Key,
    });

    // Generate pre-signed URL valid for 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }

  // Local file
  const filePath = path.join(BACKUP_DIR, record.filename);
  if (fs.existsSync(filePath)) {
    return `/api/v1/platform/settings/maintenance/backups/download-file/${record.filename}`;
  }

  throw new Error('Backup file not found');
}

export async function deleteBackup(
  backupId: string,
  awsConfig?: { accessKeyId: string; secretAccessKey: string; region: string; s3Bucket: string }
): Promise<void> {
  const recordIndex = backupRecords.findIndex(r => r.id === backupId);
  
  if (recordIndex === -1 && !backupId.startsWith('local_')) {
    throw new Error('Backup not found');
  }

  let filename: string;
  let s3Key: string | undefined;
  let destination: 'local' | 's3' = 'local';

  if (recordIndex >= 0) {
    const record = backupRecords[recordIndex];
    filename = record.filename;
    s3Key = record.s3Key;
    destination = record.destination;
    backupRecords.splice(recordIndex, 1);
  } else {
    filename = backupId.replace('local_', '');
  }

  // Delete from S3
  if (destination === 's3' && s3Key && awsConfig) {
    const s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });

    await s3Client.send(new DeleteObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: s3Key,
    }));
  }

  // Delete local file
  const filePath = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  logger.info({ backupId, filename }, 'Backup deleted');
}

export function getBackupFilePath(filename: string): string | null {
  const filePath = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(filePath) && filename.endsWith('.sql')) {
    return filePath;
  }
  return null;
}

// Clean up old backups based on retention policy
export async function cleanupOldBackups(
  retentionDays: number,
  awsConfig?: { accessKeyId: string; secretAccessKey: string; region: string; s3Bucket: string }
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = backupRecords.filter(r => 
    new Date(r.createdAt) < cutoffDate && r.type === 'scheduled'
  );

  for (const backup of oldBackups) {
    try {
      await deleteBackup(backup.id, awsConfig);
    } catch (error) {
      logger.error({ error, backupId: backup.id }, 'Failed to delete old backup');
    }
  }

  // Also clean local files
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    for (const filename of files) {
      const filePath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(filePath);
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        logger.info({ filename }, 'Deleted old backup file');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to clean up local backup files');
  }
}
