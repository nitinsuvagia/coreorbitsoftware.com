/**
 * Onboarding Documents Service
 * Manages document storage for candidates during onboarding process
 * Documents are stored in "On-Boarding" folder under Document Management
 * When candidate becomes an employee, documents are moved to their employee folder
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3007';

interface CandidateFolder {
  id: string;
  path: string;
}

interface SubFolder {
  id: string;
  name: string;
  path: string;
}

interface OnBoardingFolders {
  rootFolder: CandidateFolder | null;
  subfolders: SubFolder[];
}

interface UploadDocumentInput {
  candidateId: string;
  candidateName: string;
  subfolder: 'Offer Letters' | 'Personal Documents' | 'Education' | 'Experience' | 'Bank Details' | 'Other';
  filename: string;
  content: Buffer;
  mimeType: string;
  description?: string;
  tags?: string[];
}

interface UploadResult {
  fileId: string;
  filename: string;
  url: string;
  folderId: string;
}

/**
 * Create onboarding folders for a candidate in Document Management
 */
export async function createCandidateOnBoardingFolders(
  tenantSlug: string,
  candidateId: string,
  candidateName: string,
  authToken: string
): Promise<CandidateFolder | null> {
  try {
    const response = await axios.post(
      `${DOCUMENT_SERVICE_URL}/api/v1/onboarding/folders`,
      {
        candidateId,
        candidateName,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (response.data?.success) {
      logger.info({ candidateId, folder: response.data.folder }, 'Created onboarding folders for candidate');
      return response.data.folder;
    }

    return null;
  } catch (error: any) {
    logger.error({ error: error.message, candidateId }, 'Failed to create onboarding folders');
    return null;
  }
}

/**
 * Get candidate's onboarding folder structure
 */
export async function getCandidateOnBoardingFolders(
  tenantSlug: string,
  candidateId: string,
  authToken: string
): Promise<OnBoardingFolders | null> {
  try {
    const response = await axios.get(
      `${DOCUMENT_SERVICE_URL}/api/v1/onboarding/folders/${candidateId}`,
      {
        headers: {
          'x-tenant-slug': tenantSlug,
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (response.data?.success) {
      return response.data.folders;
    }

    return null;
  } catch (error: any) {
    logger.error({ error: error.message, candidateId }, 'Failed to get onboarding folders');
    return null;
  }
}

/**
 * Upload a document to candidate's onboarding folder
 */
export async function uploadOnBoardingDocument(
  tenantSlug: string,
  input: UploadDocumentInput,
  authToken: string
): Promise<UploadResult | null> {
  try {
    // First ensure folders exist
    const folders = await getCandidateOnBoardingFolders(tenantSlug, input.candidateId, authToken);
    
    let targetFolderId: string | undefined;
    
    if (folders?.subfolders) {
      const subfolder = folders.subfolders.find(f => f.name === input.subfolder);
      targetFolderId = subfolder?.id;
    }

    // If no folders exist, create them
    if (!folders?.rootFolder) {
      const newFolder = await createCandidateOnBoardingFolders(
        tenantSlug,
        input.candidateId,
        input.candidateName,
        authToken
      );
      
      if (newFolder) {
        // Get folders again to get subfolder IDs
        const updatedFolders = await getCandidateOnBoardingFolders(tenantSlug, input.candidateId, authToken);
        if (updatedFolders?.subfolders) {
          const subfolder = updatedFolders.subfolders.find(f => f.name === input.subfolder);
          targetFolderId = subfolder?.id;
        }
      }
    }

    // Upload the file
    const formData = new FormData();
    formData.append('file', new Blob([input.content], { type: input.mimeType }), input.filename);
    if (targetFolderId) {
      formData.append('folderId', targetFolderId);
    }
    if (input.description) {
      formData.append('description', input.description);
    }
    if (input.tags && input.tags.length > 0) {
      formData.append('tags', JSON.stringify(input.tags));
    }
    formData.append('entityType', 'CANDIDATE');
    formData.append('entityId', input.candidateId);

    const response = await axios.post(
      `${DOCUMENT_SERVICE_URL}/api/v1/files`,
      formData,
      {
        headers: {
          'x-tenant-slug': tenantSlug,
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data?.success) {
      logger.info({ 
        candidateId: input.candidateId, 
        filename: input.filename,
        fileId: response.data.file?.id,
      }, 'Uploaded document to onboarding folder');
      
      return {
        fileId: response.data.file.id,
        filename: input.filename,
        url: response.data.file.url || response.data.file.id,
        folderId: targetFolderId || '',
      };
    }

    return null;
  } catch (error: any) {
    logger.error({ error: error.message, candidateId: input.candidateId }, 'Failed to upload onboarding document');
    return null;
  }
}

/**
 * Move all candidate's onboarding documents to employee folder
 * Called when candidate is hired and becomes an employee
 */
export async function moveOnBoardingDocsToEmployee(
  tenantSlug: string,
  candidateId: string,
  employeeId: string,
  employeeCode: string,
  employeeName: string,
  authToken: string
): Promise<boolean> {
  try {
    const response = await axios.post(
      `${DOCUMENT_SERVICE_URL}/api/v1/onboarding/move-to-employee`,
      {
        candidateId,
        employeeId,
        employeeCode,
        employeeName,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (response.data?.success) {
      logger.info({ 
        candidateId, 
        employeeId,
        filesCount: response.data.filesCount,
      }, 'Moved onboarding documents to employee folder');
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error({ error: error.message, candidateId, employeeId }, 'Failed to move onboarding documents');
    return false;
  }
}

/**
 * Store offer letter PDF in candidate's onboarding folder
 * This is called internally without auth token - uses system user
 */
export async function storeOfferLetterInOnBoarding(
  tenantSlug: string,
  candidateId: string,
  candidateName: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<UploadResult | null> {
  try {
    // For internal calls without user auth, we'll use direct database access
    // Import getTenantPrisma dynamically to avoid circular dependency
    const { getTenantPrisma } = await import('@oms/database');
    const db = await getTenantPrisma(tenantSlug);
    
    // Import folder-init functions from document-service
    // Since this is a different service, we need to implement locally or call API
    // For now, we'll store in local filesystem and provide the path
    // The document can be moved to document management when candidate is hired
    
    const fs = await import('fs');
    const path = await import('path');
    const { v4: uuidv4 } = await import('uuid');
    
    const fileId = uuidv4();
    const htmlFilename = `${fileId}.html`;
    
    // Store in shared uploads directory - unified structure under documents/tenants/{tenant}/
    const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), '../../uploads');
    const offerLettersDir = path.join(baseDir, 'documents', 'tenants', tenantSlug, 'on-boarding', candidateId, 'offer-letters');
    
    // Ensure directory exists
    if (!fs.existsSync(offerLettersDir)) {
      fs.mkdirSync(offerLettersDir, { recursive: true });
      logger.info({ dir: offerLettersDir }, 'Created onboarding offer letters directory');
    }
    
    // Write the HTML file
    const filePath = path.join(offerLettersDir, htmlFilename);
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Write metadata JSON
    const metadataPath = path.join(offerLettersDir, `${fileId}.json`);
    const metadata = {
      id: fileId,
      filename: filename.replace('.pdf', '.html'),
      originalFilename: filename,
      tenantSlug,
      candidateId,
      candidateName,
      entityType: 'CANDIDATE',
      description: 'Accepted Offer Letter with Digital Signature',
      tags: ['offer-letter', 'accepted', 'signed', 'onboarding'],
      createdAt: new Date().toISOString(),
      storagePath: filePath,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Construct URL for accessing the file
    const baseUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const url = `${baseUrl}/uploads/on-boarding/${tenantSlug}/${candidateId}/offer-letters/${htmlFilename}`;
    
    logger.info({ 
      fileId, 
      candidateId,
      candidateName,
      filePath,
      url,
    }, 'Offer letter stored in onboarding folder');
    
    return {
      fileId,
      filename: htmlFilename,
      url,
      folderId: candidateId,
    };
  } catch (error: any) {
    logger.error({ 
      error: error.message, 
      candidateId,
      stack: error.stack,
    }, 'Failed to store offer letter in onboarding folder');
    return null;
  }
}
