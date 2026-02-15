/**
 * Folder Initialization Service - Creates default folder structure for tenants
 */

import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../utils/logger';

interface FolderStructure {
  name: string;
  description?: string;
  color?: string;
  children?: FolderStructure[];
}

const COMPANY_MASTER_STRUCTURE: FolderStructure = {
  name: 'Company Master',
  description: 'Company-wide documents and templates',
  color: 'blue',
  children: [
    {
      name: 'Policies',
      description: 'Company policies and procedures',
      color: 'red',
    },
    {
      name: 'Forms',
      description: 'Standard company forms and templates',
      color: 'green',
    },
    {
      name: 'Templates',
      description: 'Document templates',
      color: 'purple',
    },
    {
      name: 'Certifications',
      description: 'Company certifications and licenses',
      color: 'orange',
    },
    {
      name: 'Legal Documents',
      description: 'Legal agreements and contracts',
      color: 'red',
    },
    {
      name: 'Training Materials',
      description: 'Training resources and materials',
      color: 'blue',
    },
    {
      name: 'Company Assets',
      description: 'Company logos, branding, and assets',
      color: 'pink',
    },
  ],
};

// On-Boarding folder structure - for candidates before they become employees
const ON_BOARDING_STRUCTURE: FolderStructure = {
  name: 'On-Boarding',
  description: 'Documents for candidates going through on-boarding process',
  color: 'indigo',
  children: [], // Candidate folders will be created dynamically
};

// Subfolders for each candidate during on-boarding
const CANDIDATE_ONBOARDING_SUBFOLDERS: FolderStructure[] = [
  {
    name: 'Offer Letters',
    description: 'Accepted offer letters with signatures',
    color: 'green',
  },
  {
    name: 'Personal Documents',
    description: 'ID proofs, address proof, photos',
    color: 'blue',
  },
  {
    name: 'Education',
    description: 'Education certificates and transcripts',
    color: 'purple',
  },
  {
    name: 'Experience',
    description: 'Previous employment documents',
    color: 'orange',
  },
  {
    name: 'Bank Details',
    description: 'Bank account information and cancelled cheques',
    color: 'yellow',
  },
  {
    name: 'Other',
    description: 'Other supporting documents',
    color: 'gray',
  },
];

const EMPLOYEE_DOCUMENT_SUBFOLDERS: FolderStructure[] = [
  {
    name: 'Personal Documents',
    description: 'ID, address proof, and personal certificates',
    color: 'blue',
  },
  {
    name: 'Joining Documents',
    description: 'Offer letter, appointment letter, agreements',
    color: 'green',
  },
  {
    name: 'Payroll',
    description: 'Salary slips, tax documents, bank details',
    color: 'orange',
  },
  {
    name: 'Performance Reviews',
    description: 'Appraisals and performance evaluations',
    color: 'purple',
  },
  {
    name: 'Training Certificates',
    description: 'Training completion certificates',
    color: 'pink',
  },
  {
    name: 'Leave & Attendance',
    description: 'Leave applications and attendance records',
    color: 'yellow',
  },
  {
    name: 'Exit Documents',
    description: 'Resignation, exit interview, clearance forms',
    color: 'red',
  },
];

/**
 * Create a folder structure recursively
 */
async function createFolderStructure(
  prisma: PrismaClient,
  structure: FolderStructure,
  parentId: string | null,
  parentPath: string,
  userId: string
): Promise<string> {
  const path = parentPath ? `${parentPath}/${structure.name}` : `/${structure.name}`;
  const depth = parentPath ? parentPath.split('/').filter(Boolean).length + 1 : 1;

  // Check if folder already exists
  const existing = await prisma.folder.findFirst({
    where: {
      name: structure.name,
      parentId: parentId,
    },
  });

  let folderId: string;

  if (existing) {
    folderId = existing.id;
    logger.info({ folderId, name: structure.name }, 'Folder already exists');
  } else {
    const folder = await prisma.folder.create({
      data: {
        name: structure.name,
        description: structure.description,
        color: structure.color,
        parentId,
        path,
        depth,
        createdBy: userId,
      },
    });
    folderId = folder.id;
    logger.info({ folderId, name: structure.name, path }, 'Created folder');
  }

  // Create children recursively
  if (structure.children && structure.children.length > 0) {
    for (const child of structure.children) {
      await createFolderStructure(prisma, child, folderId, path, userId);
    }
  }

  return folderId;
}

/**
 * Initialize Company Master folder structure
 */
export async function initializeCompanyMasterFolders(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  logger.info('Initializing Company Master folder structure');

  try {
    await createFolderStructure(prisma, COMPANY_MASTER_STRUCTURE, null, '', userId);
    logger.info('Company Master folder structure initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Company Master folders');
    throw error;
  }
}

/**
 * Initialize Employee Documents folder structure
 */
export async function initializeEmployeeDocumentsFolders(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  logger.info('Initializing Employee Documents folder structure');

  try {
    // Create or get main Employee Documents folder
    const employeeDocsPath = '/Employee Documents';
    let employeeDocsFolder = await prisma.folder.findFirst({
      where: {
        name: 'Employee Documents',
        parentId: null,
      },
    });

    if (!employeeDocsFolder) {
      employeeDocsFolder = await prisma.folder.create({
        data: {
          name: 'Employee Documents',
          description: 'Employee-specific documents and records',
          color: 'green',
          parentId: null,
          path: employeeDocsPath,
          depth: 1,
          createdBy: userId,
        },
      });
      logger.info({ folderId: employeeDocsFolder.id }, 'Created Employee Documents root folder');
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
      },
      orderBy: {
        employeeCode: 'asc',
      },
    });

    logger.info({ count: employees.length }, 'Found employees');

    // Create folder for each employee
    for (const employee of employees) {
      const employeeName = `${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`;
      const employeePath = `${employeeDocsPath}/${employeeName}`;

      // Check if employee folder already exists
      let employeeFolder = await prisma.folder.findFirst({
        where: {
          name: employeeName,
          parentId: employeeDocsFolder.id,
        },
      });

      if (!employeeFolder) {
        employeeFolder = await prisma.folder.create({
          data: {
            name: employeeName,
            description: `Documents for ${employee.firstName} ${employee.lastName}`,
            parentId: employeeDocsFolder.id,
            path: employeePath,
            depth: 2,
            createdBy: userId,
          },
        });
        logger.info({ employeeId: employee.id, folderId: employeeFolder.id }, 'Created employee folder');
      }

      // Create subfolders for this employee
      for (const subfolder of EMPLOYEE_DOCUMENT_SUBFOLDERS) {
        await createFolderStructure(
          prisma,
          subfolder,
          employeeFolder.id,
          employeePath,
          userId
        );
      }
    }

    logger.info('Employee Documents folder structure initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Employee Documents folders');
    throw error;
  }
}

/**
 * Initialize complete default folder structure
 */
export async function initializeDefaultFolderStructure(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  logger.info('Initializing complete default folder structure');

  try {
    await initializeCompanyMasterFolders(prisma, userId);
    await initializeEmployeeDocumentsFolders(prisma, userId);
    await initializeOnBoardingFolders(prisma, userId);
    logger.info('Default folder structure initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize default folder structure');
    throw error;
  }
}

/**
 * Create folders for a new employee
 */
export async function createEmployeeFolders(
  prisma: PrismaClient,
  employeeId: string,
  userId: string
): Promise<void> {
  logger.info({ employeeId }, 'Creating folders for new employee');

  try {
    // Get user to find employee ID
    const user = await prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user || !user.employeeId) {
      throw new Error('User or employee not found');
    }

    // Get employee details including employee code
    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get or create Employee Documents root folder
    let employeeDocsFolder = await prisma.folder.findFirst({
      where: {
        name: 'Employee Documents',
        parentId: null,
      },
    });

    if (!employeeDocsFolder) {
      employeeDocsFolder = await prisma.folder.create({
        data: {
          name: 'Employee Documents',
          description: 'Employee-specific documents and records',
          color: 'green',
          parentId: null,
          path: '/Employee Documents',
          depth: 1,
          createdBy: userId,
        },
      });
    }

    // Create employee folder
    const employeeName = `${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`;
    const employeePath = `/Employee Documents/${employeeName}`;

    const employeeFolder = await prisma.folder.create({
      data: {
        name: employeeName,
        description: `Documents for ${employee.firstName} ${employee.lastName}`,
        parentId: employeeDocsFolder.id,
        path: employeePath,
        depth: 2,
        createdBy: userId,
      },
    });

    // Create subfolders
    for (const subfolder of EMPLOYEE_DOCUMENT_SUBFOLDERS) {
      await createFolderStructure(
        prisma,
        subfolder,
        employeeFolder.id,
        employeePath,
        userId
      );
    }

    logger.info({ employeeId, folderId: employeeFolder.id }, 'Employee folders created successfully');
  } catch (error) {
    logger.error({ error, employeeId }, 'Failed to create employee folders');
    throw error;
  }
}
/**
 * Initialize On-Boarding folder structure
 */
export async function initializeOnBoardingFolders(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  logger.info('Initializing On-Boarding folder structure');

  try {
    await createFolderStructure(prisma, ON_BOARDING_STRUCTURE, null, '', userId);
    logger.info('On-Boarding folder structure initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize On-Boarding folders');
    throw error;
  }
}

/**
 * Get or create On-Boarding root folder
 */
export async function getOrCreateOnBoardingFolder(
  prisma: PrismaClient,
  userId: string
): Promise<{ id: string; path: string }> {
  let onBoardingFolder = await prisma.folder.findFirst({
    where: {
      name: 'On-Boarding',
      parentId: null,
    },
  });

  if (!onBoardingFolder) {
    onBoardingFolder = await prisma.folder.create({
      data: {
        name: 'On-Boarding',
        description: 'Documents for candidates going through on-boarding process',
        color: 'indigo',
        parentId: null,
        path: '/On-Boarding',
        depth: 1,
        createdBy: userId,
      },
    });
    logger.info({ folderId: onBoardingFolder.id }, 'Created On-Boarding root folder');
  }

  return { id: onBoardingFolder.id, path: onBoardingFolder.path || '/On-Boarding' };
}

/**
 * Create folder structure for a candidate during on-boarding
 */
export async function createCandidateOnBoardingFolders(
  prisma: PrismaClient,
  candidateId: string,
  candidateName: string,
  userId: string
): Promise<{ id: string; path: string }> {
  logger.info({ candidateId, candidateName }, 'Creating on-boarding folders for candidate');

  try {
    // Get or create On-Boarding root folder
    const onBoardingFolder = await getOrCreateOnBoardingFolder(prisma, userId);

    // Create candidate folder
    const candidateFolderName = `${candidateId} - ${candidateName}`;
    const candidatePath = `${onBoardingFolder.path}/${candidateFolderName}`;

    // Check if already exists
    let candidateFolder = await prisma.folder.findFirst({
      where: {
        name: candidateFolderName,
        parentId: onBoardingFolder.id,
      },
    });

    if (!candidateFolder) {
      candidateFolder = await prisma.folder.create({
        data: {
          name: candidateFolderName,
          description: `On-boarding documents for ${candidateName}`,
          parentId: onBoardingFolder.id,
          path: candidatePath,
          depth: 2,
          createdBy: userId,
        },
      });
      logger.info({ candidateId, folderId: candidateFolder.id }, 'Created candidate on-boarding folder');

      // Create subfolders for this candidate
      for (const subfolder of CANDIDATE_ONBOARDING_SUBFOLDERS) {
        await createFolderStructure(
          prisma,
          subfolder,
          candidateFolder.id,
          candidatePath,
          userId
        );
      }
    }

    return { id: candidateFolder.id, path: candidatePath };
  } catch (error) {
    logger.error({ error, candidateId }, 'Failed to create candidate on-boarding folders');
    throw error;
  }
}

/**
 * Get candidate's on-boarding folder and subfolders
 */
export async function getCandidateOnBoardingFolder(
  prisma: PrismaClient,
  candidateId: string
): Promise<{
  rootFolder: { id: string; path: string } | null;
  subfolders: { name: string; id: string; path: string }[];
}> {
  // Find the On-Boarding root folder
  const onBoardingFolder = await prisma.folder.findFirst({
    where: {
      name: 'On-Boarding',
      parentId: null,
    },
  });

  if (!onBoardingFolder) {
    return { rootFolder: null, subfolders: [] };
  }

  // Find candidate folder (starts with candidateId)
  const candidateFolder = await prisma.folder.findFirst({
    where: {
      parentId: onBoardingFolder.id,
      name: { startsWith: `${candidateId} -` },
    },
  });

  if (!candidateFolder) {
    return { rootFolder: null, subfolders: [] };
  }

  // Get subfolders
  const subfolders = await prisma.folder.findMany({
    where: {
      parentId: candidateFolder.id,
    },
    select: {
      id: true,
      name: true,
      path: true,
    },
  });

  return {
    rootFolder: { id: candidateFolder.id, path: candidateFolder.path || '' },
    subfolders: subfolders.map(f => ({ id: f.id, name: f.name, path: f.path || '' })),
  };
}

/**
 * Move all documents from candidate's on-boarding folder to employee folder
 * Called when candidate is hired and employee is created
 */
export async function moveOnBoardingDocsToEmployee(
  prisma: PrismaClient,
  candidateId: string,
  employeeId: string,
  employeeCode: string,
  employeeName: string,
  userId: string
): Promise<void> {
  logger.info({ candidateId, employeeId }, 'Moving on-boarding documents to employee folder');

  try {
    // Get candidate's on-boarding folder
    const candidateFolders = await getCandidateOnBoardingFolder(prisma, candidateId);
    
    if (!candidateFolders.rootFolder) {
      logger.info({ candidateId }, 'No on-boarding folder found for candidate');
      return;
    }

    // Create employee folders if they don't exist
    await createEmployeeFolders(prisma, employeeId, userId);

    // Get employee folder
    const employeeDocsFolder = await prisma.folder.findFirst({
      where: {
        name: 'Employee Documents',
        parentId: null,
      },
    });

    if (!employeeDocsFolder) {
      throw new Error('Employee Documents folder not found');
    }

    const employeeFolderName = `${employeeCode} - ${employeeName}`;
    const employeeFolder = await prisma.folder.findFirst({
      where: {
        name: employeeFolderName,
        parentId: employeeDocsFolder.id,
      },
    });

    if (!employeeFolder) {
      throw new Error(`Employee folder ${employeeFolderName} not found`);
    }

    // Get all files from candidate's on-boarding folders
    const candidateFiles = await prisma.file.findMany({
      where: {
        folderId: {
          in: [candidateFolders.rootFolder.id, ...candidateFolders.subfolders.map(f => f.id)],
        },
      },
    });

    // Map on-boarding subfolder names to employee subfolder names
    const folderMapping: Record<string, string> = {
      'Offer Letters': 'Joining Documents',
      'Personal Documents': 'Personal Documents',
      'Education': 'Personal Documents',
      'Experience': 'Personal Documents',
      'Bank Details': 'Payroll',
      'Other': 'Personal Documents',
    };

    // Get employee subfolders
    const employeeSubfolders = await prisma.folder.findMany({
      where: {
        parentId: employeeFolder.id,
      },
    });

    // Move each file to corresponding employee folder
    for (const file of candidateFiles) {
      // Find the source folder to determine target
      const sourceFolder = candidateFolders.subfolders.find(f => f.id === file.folderId);
      const targetFolderName = sourceFolder ? (folderMapping[sourceFolder.name] || 'Personal Documents') : 'Joining Documents';
      const targetFolder = employeeSubfolders.find(f => f.name === targetFolderName);

      if (targetFolder) {
        await prisma.file.update({
          where: { id: file.id },
          data: {
            folderId: targetFolder.id,
            entityType: 'EMPLOYEE',
            entityId: employeeId,
          },
        });
        logger.info({ fileId: file.id, targetFolder: targetFolder.name }, 'Moved file to employee folder');
      }
    }

    // Delete candidate's on-boarding folders (after moving files)
    // First delete subfolders
    for (const subfolder of candidateFolders.subfolders) {
      await prisma.folder.delete({
        where: { id: subfolder.id },
      });
    }
    // Then delete candidate folder
    await prisma.folder.delete({
      where: { id: candidateFolders.rootFolder.id },
    });

    logger.info({ candidateId, employeeId, filesCount: candidateFiles.length }, 'On-boarding documents moved to employee folder');
  } catch (error) {
    logger.error({ error, candidateId, employeeId }, 'Failed to move on-boarding documents');
    throw error;
  }
}