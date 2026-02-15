/**
 * Offer PDF Service - Generates PDF offer letters with signature
 */

import { logger } from '../utils/logger';
import { getTenantPrismaBySlug } from '../utils/database';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';

interface OfferPdfData {
  candidateName: string;
  candidateEmail: string;
  designation: string;
  department: string;
  salary: number;
  currency: string;
  joiningDate: Date;
  companyName: string;
  companyLogo?: string | null;
  primaryColor?: string;
  signature: string;
  termsAndConditions?: string;
  acceptedAt: Date;
}

interface GeneratedPdf {
  buffer: Buffer;
  htmlBuffer: Buffer;
  filename: string;
}

export class OfferPdfService {
  private static browser: puppeteer.Browser | null = null;

  /**
   * Get or create browser instance for PDF generation
   */
  private static async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  /**
   * Generate PDF offer letter with signature
   */
  static async generateOfferLetterPdf(data: OfferPdfData): Promise<GeneratedPdf> {
    const primaryColor = data.primaryColor || '#3B82F6';
    
    // Format values
    const formattedSalary = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: data.currency,
      maximumFractionDigits: 0,
    }).format(data.salary);

    const joiningDateFormatted = new Date(data.joiningDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const acceptedDateFormatted = new Date(data.acceptedAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const acceptedTimeFormatted = new Date(data.acceptedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo {
      max-height: 60px;
      max-width: 200px;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 0;
    }
    
    .document-title {
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
      color: #1a202c;
    }
    
    .status-badge {
      display: inline-block;
      background-color: #22c55e;
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin: 10px 0;
    }
    
    .section {
      margin: 25px 0;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: ${primaryColor};
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .detail-item {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border-left: 3px solid ${primaryColor};
    }
    
    .detail-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 4px;
    }
    
    .salary-highlight {
      background: linear-gradient(135deg, #22c55e15 0%, #16a34a15 100%);
      border-left-color: #22c55e;
    }
    
    .terms-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      font-size: 11px;
      line-height: 1.5;
      color: #475569;
      /* No height limit for PDF/HTML - show all terms */
    }
    
    .terms-section h4 {
      margin-top: 15px;
      margin-bottom: 8px;
      color: #334155;
    }
    
    .signature-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px dashed #e2e8f0;
      page-break-inside: avoid;
    }
    
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 10px;
    }
    
    .signature-image {
      height: 80px;
      border-bottom: 2px solid #1a202c;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: #fff;
    }
    
    .signature-image img {
      max-height: 70px;
      max-width: 200px;
      object-fit: contain;
    }
    
    .signer-name {
      font-weight: 600;
      color: #1e293b;
    }
    
    .signer-date {
      font-size: 11px;
      color: #64748b;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    
    .footer-logo {
      max-height: 30px;
      opacity: 0.6;
      margin-bottom: 10px;
    }
    
    .footer-text {
      font-size: 10px;
      color: #94a3b8;
    }
    
    .timestamp {
      background: #f1f5f9;
      padding: 8px 15px;
      border-radius: 4px;
      font-size: 10px;
      color: #64748b;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${data.companyLogo 
      ? `<img src="${data.companyLogo}" alt="${data.companyName}" class="logo" />`
      : `<h1 class="company-name">${data.companyName}</h1>`
    }
  </div>

  <div class="document-title">
    OFFER LETTER
    <br/>
    <span class="status-badge">✓ ACCEPTED</span>
  </div>

  <div class="section">
    <p>Dear <strong>${data.candidateName}</strong>,</p>
    <p>
      We are pleased to confirm that you have accepted our offer of employment at 
      <strong>${data.companyName}</strong>. This letter serves as official documentation 
      of your acceptance and the agreed terms of employment.
    </p>
  </div>

  <div class="section">
    <div class="section-title">Position Details</div>
    <div class="details-grid">
      <div class="detail-item">
        <div class="detail-label">Position</div>
        <div class="detail-value">${data.designation}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Department</div>
        <div class="detail-value">${data.department}</div>
      </div>
      <div class="detail-item salary-highlight">
        <div class="detail-label">Annual Salary</div>
        <div class="detail-value">${formattedSalary}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Start Date</div>
        <div class="detail-value">${joiningDateFormatted}</div>
      </div>
    </div>
  </div>

  ${data.termsAndConditions ? `
  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <div class="terms-section">
      ${data.termsAndConditions.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
  </div>
  ` : ''}

  <div class="signature-section">
    <div class="section-title">Digital Acceptance</div>
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-label">Candidate Signature</div>
        <div class="signature-image">
          ${data.signature ? `<img src="${data.signature}" alt="Candidate Signature" style="max-height: 70px; max-width: 200px;" />` : '<div style="color: #999; font-style: italic;">No signature provided</div>'}
        </div>
        <div class="signer-name">${data.candidateName}</div>
        <div class="signer-date">${data.candidateEmail}</div>
      </div>
      <div class="signature-box">
        <div class="signature-label">Acceptance Details</div>
        <div style="text-align: left; padding-top: 20px;">
          <div class="detail-label">Date Accepted</div>
          <div class="detail-value">${acceptedDateFormatted}</div>
          <br/>
          <div class="detail-label">Time</div>
          <div class="detail-value">${acceptedTimeFormatted}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="timestamp">
    This document was digitally signed and accepted on ${acceptedDateFormatted} at ${acceptedTimeFormatted}.
    <br/>
    Document generated automatically by ${data.companyName} HR System.
  </div>

  <div class="footer">
    ${data.companyLogo 
      ? `<img src="${data.companyLogo}" alt="${data.companyName}" class="footer-logo" />`
      : ''
    }
    <div class="footer-text">
      This is a system-generated document. For any queries, please contact HR.
      <br/>
      © ${new Date().getFullYear()} ${data.companyName}. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    // Generate filename
    const sanitizedName = data.candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Offer_Letter_${sanitizedName}_${dateStr}.pdf`;

    logger.info({ candidateName: data.candidateName, filename }, 'Generating offer letter PDF using Puppeteer');

    try {
      // Use Puppeteer to generate actual PDF
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set content and wait for images to load
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });
      
      await page.close();
      
      logger.info({ candidateName: data.candidateName, filename, pdfSize: pdfBuffer.length }, 'PDF generated successfully');

      return {
        buffer: Buffer.from(pdfBuffer),
        htmlBuffer: Buffer.from(html, 'utf-8'),
        filename,
      };
    } catch (error: any) {
      logger.error({ error: error.message, candidateName: data.candidateName }, 'Failed to generate PDF, falling back to HTML');
      
      // Fallback to HTML if PDF generation fails
      return {
        buffer: Buffer.from(html, 'utf-8'),
        htmlBuffer: Buffer.from(html, 'utf-8'),
        filename: filename.replace('.pdf', '.html'),
      };
    }
  }

  /**
   * Store the generated offer letter PDF in the On-Boarding folder structure
   * Structure: uploads/on-boarding/{tenantSlug}/{candidateId}/offer-letters/{fileId}.pdf
   * 
   * This organizes documents by:
   * - Tenant (multi-tenant support)
   * - Candidate (all their onboarding docs together)
   * - Document type (offer-letters, personal-docs, etc.)
   * 
   * When the candidate becomes an employee, these will be moved to the Employee Documents folder
   */
  static async storeOfferPdf(
    tenantSlug: string,
    employeeId: string | null,
    candidateId: string,
    pdfBuffer: Buffer,
    filename: string,
    candidateName?: string,
    htmlBuffer?: Buffer
  ): Promise<{ fileId: string; url?: string } | null> {
    try {
      // Use the local database utility (avoids ESM/CJS compatibility issues)
      const db = await getTenantPrismaBySlug(tenantSlug);
      
      // Generate unique file ID
      const fileId = uuidv4();
      const pdfFilename = `${fileId}.pdf`;
      const htmlFilename = `${fileId}.html`;
      
      // Create directory structure: uploads/documents/tenants/{tenantSlug}/on-boarding/{candidateId}/offer-letters/
      // NOTE: Must be under 'documents/tenants/{tenant}/' to match document-service's storage pattern
      const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), '../../uploads');
      const onBoardingDir = path.join(baseDir, 'documents', 'tenants', tenantSlug, 'on-boarding', candidateId, 'offer-letters');
      
      // Ensure directory exists
      if (!fs.existsSync(onBoardingDir)) {
        fs.mkdirSync(onBoardingDir, { recursive: true });
        logger.info({ dir: onBoardingDir }, 'Created on-boarding offer letters directory');
      }
      
      // Write the PDF file to filesystem
      const pdfFilePath = path.join(onBoardingDir, pdfFilename);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      logger.info({ pdfFilePath, size: pdfBuffer.length }, 'PDF file written');
      
      // Write metadata file for storage service (required for Content-Type detection)
      const pdfMetaPath = `${pdfFilePath}.meta.json`;
      fs.writeFileSync(pdfMetaPath, JSON.stringify({
        contentType: 'application/pdf',
        originalName: filename,
        metadata: {
          candidateId,
          candidateName,
          entityType: 'CANDIDATE',
        },
      }, null, 2));
      logger.info({ pdfMetaPath }, 'PDF metadata file written');
      
      // Also write the HTML file for web preview
      if (htmlBuffer) {
        const htmlFilePath = path.join(onBoardingDir, htmlFilename);
        fs.writeFileSync(htmlFilePath, htmlBuffer);
        logger.info({ htmlFilePath }, 'HTML file written for preview');
      }
      
      // ============================================================
      // SAVE TO DATABASE FOR DOCUMENT MANAGEMENT VISIBILITY
      // ============================================================
      
      // Get a system user ID for created_by/uploaded_by (FK constraint requires valid user)
      // Just get any active user - no need to find admin specifically
      const systemUser = await db.user.findFirst({
        where: { 
          status: 'ACTIVE',
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' }, // Get oldest user (likely an admin)
      });
      
      // Fallback: get ANY user if no admin found
      const anyUser = systemUser || await db.user.findFirst({ select: { id: true } });
      
      if (!anyUser) {
        logger.warn('No user found in database for document ownership. Skipping database record creation.');
        // Still return success since file was saved to filesystem
        const baseUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
        return {
          fileId,
          url: `${baseUrl}/uploads/on-boarding/${tenantSlug}/${candidateId}/offer-letters/${pdfFilename}`,
        };
      }
      
      const systemUserId = anyUser.id;
      logger.info({ systemUserId }, 'Using system user for document ownership');
      
      // Get or create On-Boarding root folder
      let onBoardingFolder = await db.folder.findFirst({
        where: { name: 'On-Boarding', parentId: null },
      });
      
      if (!onBoardingFolder) {
        onBoardingFolder = await db.folder.create({
          data: {
            id: `ob-folder-${uuidv4().substring(0, 8)}`,
            name: 'On-Boarding',
            description: 'Documents for candidates going through on-boarding process',
            color: 'indigo',
            parentId: null,
            path: '/On-Boarding',
            depth: 1,
            createdBy: systemUserId,
          },
        });
        logger.info({ folderId: onBoardingFolder.id }, 'Created On-Boarding root folder');
      }
      
      // Get or create candidate folder
      const candidateFolderName = `${candidateId} - ${candidateName || 'Candidate'}`;
      let candidateFolder = await db.folder.findFirst({
        where: { 
          name: candidateFolderName, 
          parentId: onBoardingFolder.id 
        },
      });
      
      if (!candidateFolder) {
        candidateFolder = await db.folder.create({
          data: {
            id: `cand-folder-${uuidv4().substring(0, 8)}`,
            name: candidateFolderName,
            description: `On-boarding documents for ${candidateName || candidateId}`,
            color: 'blue',
            parentId: onBoardingFolder.id,
            path: `/On-Boarding/${candidateFolderName}`,
            depth: 2,
            createdBy: systemUserId,
          },
        });
        logger.info({ folderId: candidateFolder.id, candidateId }, 'Created candidate folder');
      }
      
      // Get or create Offer Letters subfolder
      let offerLettersFolder = await db.folder.findFirst({
        where: { 
          name: 'Offer Letters', 
          parentId: candidateFolder.id 
        },
      });
      
      if (!offerLettersFolder) {
        offerLettersFolder = await db.folder.create({
          data: {
            id: `ol-folder-${uuidv4().substring(0, 8)}`,
            name: 'Offer Letters',
            description: 'Accepted offer letters with signatures',
            color: 'green',
            parentId: candidateFolder.id,
            path: `/On-Boarding/${candidateFolderName}/Offer Letters`,
            depth: 3,
            createdBy: systemUserId,
          },
        });
        logger.info({ folderId: offerLettersFolder.id }, 'Created Offer Letters folder');
      }
      
      // Storage key for local filesystem (relative to uploads/documents/)
      const storageKey = `tenants/${tenantSlug}/on-boarding/${candidateId}/offer-letters/${pdfFilename}`;
      
      // Create file record in database
      await db.file.create({
        data: {
          id: fileId,
          folderId: offerLettersFolder.id,
          name: filename,
          storageName: pdfFilename,
          storageKey: storageKey,
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
          description: `Accepted Offer Letter for ${candidateName || candidateId} with Digital Signature`,
          tags: ['offer-letter', 'accepted', 'signed', 'onboarding'],
          entityType: 'CANDIDATE',
          entityId: candidateId,
          uploadedBy: systemUserId,
          currentVersion: 1,
        },
      });
      logger.info({ fileId, folderId: offerLettersFolder.id }, 'File record created in database');
      
      // Write a metadata JSON file
      const metadataPath = path.join(onBoardingDir, `${fileId}.json`);
      const metadata = {
        id: fileId,
        filename: filename,
        pdfFile: pdfFilename,
        htmlFile: htmlBuffer ? htmlFilename : null,
        tenantSlug,
        candidateId,
        candidateName,
        employeeId,
        entityType: 'CANDIDATE',
        entityId: candidateId,
        description: 'Accepted Offer Letter with Digital Signature',
        tags: ['offer-letter', 'accepted', 'signed', 'onboarding'],
        createdAt: new Date().toISOString(),
        storagePath: pdfFilePath,
        storageKey: storageKey,
        folderId: offerLettersFolder.id,
        folderType: 'on-boarding',
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      // Construct URL for accessing the PDF file
      const baseUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
      const url = `${baseUrl}/uploads/on-boarding/${tenantSlug}/${candidateId}/offer-letters/${pdfFilename}`;
      
      logger.info({ 
        fileId, 
        candidateId,
        candidateName,
        employeeId,
        pdfFilePath,
        url,
        pdfSize: pdfBuffer.length,
        folderId: offerLettersFolder.id,
      }, 'Offer letter PDF stored in on-boarding folder and database');
      
      return {
        fileId,
        url,
      };
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        candidateId,
        employeeId,
        stack: error.stack,
      }, 'Error storing offer PDF in on-boarding folder');
      return null;
    }
  }
}
