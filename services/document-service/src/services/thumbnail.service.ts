/**
 * Thumbnail Service - Generate thumbnails for various file types
 * 
 * Supports:
 * - Images (JPEG, PNG, GIF, WebP) - via Sharp
 * - PDFs - via pdf-to-img (Poppler-based)
 * - Office Documents (Word, Excel, PPT) - placeholder/icon thumbnails
 */

import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config, ThumbnailSize } from '../config';

const execAsync = promisify(exec);

// ============================================================================
// TYPES
// ============================================================================

export interface ThumbnailResult {
  size: ThumbnailSize;
  buffer: Buffer;
  contentType: string;
}

export interface ThumbnailGenerationResult {
  thumbnails: Record<ThumbnailSize, Buffer>;
  contentType: string;
}

// ============================================================================
// MIME TYPE HELPERS
// ============================================================================

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
}

export function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function isWord(mimeType: string): boolean {
  return [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].includes(mimeType);
}

export function isExcel(mimeType: string): boolean {
  return [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].includes(mimeType);
}

export function isPowerPoint(mimeType: string): boolean {
  return [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].includes(mimeType);
}

export function isOfficeDocument(mimeType: string): boolean {
  return isWord(mimeType) || isExcel(mimeType) || isPowerPoint(mimeType);
}

export function canGenerateThumbnail(mimeType: string): boolean {
  return isImage(mimeType) || isPDF(mimeType) || isOfficeDocument(mimeType);
}

export function getFileCategory(mimeType: string): 'image' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text' | 'archive' | 'other' {
  if (isImage(mimeType)) return 'image';
  if (isPDF(mimeType)) return 'pdf';
  if (isWord(mimeType)) return 'word';
  if (isExcel(mimeType)) return 'excel';
  if (isPowerPoint(mimeType)) return 'powerpoint';
  if (mimeType.startsWith('text/') || mimeType === 'application/rtf') return 'text';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('gzip')) return 'archive';
  return 'other';
}

// ============================================================================
// IMAGE THUMBNAIL GENERATION
// ============================================================================

async function generateImageThumbnail(
  buffer: Buffer,
  size: ThumbnailSize
): Promise<Buffer> {
  const dimensions = config.file.thumbnailSizes[size];
  
  return sharp(buffer)
    .resize(dimensions.width, dimensions.height, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// ============================================================================
// PDF THUMBNAIL GENERATION
// ============================================================================

async function generatePDFThumbnail(
  buffer: Buffer,
  size: ThumbnailSize
): Promise<Buffer | null> {
  const tempDir = path.join(os.tmpdir(), 'oms-thumbnails');
  const fileId = uuidv4();
  const pdfPath = path.join(tempDir, `${fileId}.pdf`);
  const outputPath = path.join(tempDir, `${fileId}.png`);
  
  try {
    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    // Write PDF to temp file
    await writeFile(pdfPath, buffer);
    
    const dimensions = config.file.thumbnailSizes[size];
    
    // Try using pdftoppm (from poppler-utils) for PDF to image conversion
    // This is commonly available on Linux/Mac systems
    try {
      await execAsync(
        `pdftoppm -png -f 1 -l 1 -scale-to ${Math.max(dimensions.width, dimensions.height)} "${pdfPath}" "${path.join(tempDir, fileId)}"`
      );
      
      // pdftoppm outputs with -1 suffix for first page
      const generatedPath = path.join(tempDir, `${fileId}-1.png`);
      if (existsSync(generatedPath)) {
        const pngBuffer = await readFile(generatedPath);
        
        // Resize to exact dimensions and convert to JPEG
        const thumbnail = await sharp(pngBuffer)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'top',
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Cleanup
        await unlink(generatedPath).catch(() => {});
        await unlink(pdfPath).catch(() => {});
        
        return thumbnail;
      }
    } catch (error) {
      logger.debug({ error }, 'pdftoppm not available, trying alternative method');
    }
    
    // Fallback: Try using ImageMagick's convert command
    try {
      await execAsync(
        `convert -density 150 "${pdfPath}[0]" -resize ${dimensions.width}x${dimensions.height}^ -gravity center -extent ${dimensions.width}x${dimensions.height} -quality 85 "${outputPath}"`
      );
      
      if (existsSync(outputPath)) {
        const pngBuffer = await readFile(outputPath);
        
        // Convert to JPEG
        const thumbnail = await sharp(pngBuffer)
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Cleanup
        await unlink(outputPath).catch(() => {});
        await unlink(pdfPath).catch(() => {});
        
        return thumbnail;
      }
    } catch (error) {
      logger.debug({ error }, 'ImageMagick not available');
    }
    
    // Fallback: Try using GraphicsMagick
    try {
      await execAsync(
        `gm convert -density 150 "${pdfPath}[0]" -resize ${dimensions.width}x${dimensions.height}^ -gravity center -extent ${dimensions.width}x${dimensions.height} -quality 85 "${outputPath}"`
      );
      
      if (existsSync(outputPath)) {
        const pngBuffer = await readFile(outputPath);
        
        const thumbnail = await sharp(pngBuffer)
          .jpeg({ quality: 85 })
          .toBuffer();
        
        await unlink(outputPath).catch(() => {});
        await unlink(pdfPath).catch(() => {});
        
        return thumbnail;
      }
    } catch (error) {
      logger.debug({ error }, 'GraphicsMagick not available');
    }
    
    // Cleanup on failure
    await unlink(pdfPath).catch(() => {});
    
    return null;
  } catch (error) {
    logger.warn({ error }, 'Failed to generate PDF thumbnail');
    
    // Cleanup
    await unlink(pdfPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    
    return null;
  }
}

// ============================================================================
// OFFICE DOCUMENT THUMBNAIL GENERATION
// ============================================================================

async function generateOfficeThumbnail(
  buffer: Buffer,
  mimeType: string,
  size: ThumbnailSize
): Promise<Buffer | null> {
  const tempDir = path.join(os.tmpdir(), 'oms-thumbnails');
  const fileId = uuidv4();
  
  // Determine file extension
  let ext = '.docx';
  if (isExcel(mimeType)) ext = '.xlsx';
  if (isPowerPoint(mimeType)) ext = '.pptx';
  if (mimeType === 'application/msword') ext = '.doc';
  if (mimeType === 'application/vnd.ms-excel') ext = '.xls';
  if (mimeType === 'application/vnd.ms-powerpoint') ext = '.ppt';
  
  const docPath = path.join(tempDir, `${fileId}${ext}`);
  const pdfPath = path.join(tempDir, `${fileId}.pdf`);
  
  try {
    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    // Write document to temp file
    await writeFile(docPath, buffer);
    
    // Try using LibreOffice to convert to PDF first, then generate thumbnail from PDF
    try {
      await execAsync(
        `soffice --headless --convert-to pdf --outdir "${tempDir}" "${docPath}"`,
        { timeout: 30000 }
      );
      
      if (existsSync(pdfPath)) {
        const pdfBuffer = await readFile(pdfPath);
        const thumbnail = await generatePDFThumbnail(pdfBuffer, size);
        
        // Cleanup
        await unlink(docPath).catch(() => {});
        await unlink(pdfPath).catch(() => {});
        
        return thumbnail;
      }
    } catch (error) {
      logger.debug({ error }, 'LibreOffice not available for Office conversion');
    }
    
    // Cleanup
    await unlink(docPath).catch(() => {});
    await unlink(pdfPath).catch(() => {});
    
    return null;
  } catch (error) {
    logger.warn({ error, mimeType }, 'Failed to generate Office document thumbnail');
    
    // Cleanup
    await unlink(docPath).catch(() => {});
    await unlink(pdfPath).catch(() => {});
    
    return null;
  }
}

// ============================================================================
// MAIN THUMBNAIL GENERATION FUNCTION
// ============================================================================

/**
 * Generate thumbnails for a file
 * Returns thumbnails for all sizes, or empty object if generation is not supported
 */
export async function generateThumbnails(
  buffer: Buffer,
  mimeType: string
): Promise<Record<ThumbnailSize, Buffer>> {
  const thumbnails: Partial<Record<ThumbnailSize, Buffer>> = {};
  const sizes: ThumbnailSize[] = ['small', 'medium', 'large'];
  
  // Images - direct processing with Sharp
  if (isImage(mimeType)) {
    for (const size of sizes) {
      try {
        thumbnails[size] = await generateImageThumbnail(buffer, size);
      } catch (error) {
        logger.warn({ size, mimeType, error }, 'Failed to generate image thumbnail');
      }
    }
    return thumbnails as Record<ThumbnailSize, Buffer>;
  }
  
  // PDFs - convert first page to image
  if (isPDF(mimeType)) {
    for (const size of sizes) {
      try {
        const thumb = await generatePDFThumbnail(buffer, size);
        if (thumb) {
          thumbnails[size] = thumb;
        }
      } catch (error) {
        logger.warn({ size, mimeType, error }, 'Failed to generate PDF thumbnail');
      }
    }
    return thumbnails as Record<ThumbnailSize, Buffer>;
  }
  
  // Office documents - convert to PDF first, then to image
  if (isOfficeDocument(mimeType)) {
    for (const size of sizes) {
      try {
        const thumb = await generateOfficeThumbnail(buffer, mimeType, size);
        if (thumb) {
          thumbnails[size] = thumb;
        }
      } catch (error) {
        logger.warn({ size, mimeType, error }, 'Failed to generate Office thumbnail');
      }
    }
    return thumbnails as Record<ThumbnailSize, Buffer>;
  }
  
  // No thumbnail support for this file type
  return {} as Record<ThumbnailSize, Buffer>;
}

/**
 * Generate a single thumbnail for a specific size
 */
export async function generateSingleThumbnail(
  buffer: Buffer,
  mimeType: string,
  size: ThumbnailSize
): Promise<Buffer | null> {
  try {
    if (isImage(mimeType)) {
      return await generateImageThumbnail(buffer, size);
    }
    
    if (isPDF(mimeType)) {
      return await generatePDFThumbnail(buffer, size);
    }
    
    if (isOfficeDocument(mimeType)) {
      return await generateOfficeThumbnail(buffer, mimeType, size);
    }
    
    return null;
  } catch (error) {
    logger.warn({ size, mimeType, error }, 'Failed to generate single thumbnail');
    return null;
  }
}
