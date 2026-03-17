/**
 * Onboarding Service - Handles candidate onboarding process
 * 
 * Flow:
 * 1. Candidate accepts offer -> status = OFFER_ACCEPTED
 * 2. HR clicks "Start On-Boarding" -> generates temp credentials, sends email
 * 3. Candidate fills onboarding details (address, emergency, education, documents)
 * 4. Candidate completes onboarding -> status = ONBOARDING_COMPLETED
 * 5. HR clicks "Mark as Hired" -> creates employee record, sends welcome email
 */

import { randomBytes, createHash } from 'crypto';
import { getTenantPrismaBySlug, getMasterPrisma } from '../utils/database';
import { logger } from '../utils/logger';
import { getEventBus, SNS_TOPICS } from '@oms/event-bus';

interface StartOnboardingInput {
  candidateId: string;
  tenantSlug: string;
}

interface OnboardingDetailsInput {
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    current?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    permanent?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    sameAsCurrent?: boolean;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
  };
  education?: Array<{
    id?: string;
    degree: string;
    institution: string;
    board?: string;
    year: number;
    grade?: string;
    percentage?: number;
  }>;
  bankDetails?: {
    accountNumber: string;
    confirmAccountNumber?: string;
    bankName: string;
    ifscCode: string;
    branchName?: string;
    accountHolderName: string;
    accountType?: string;
  };
  personal?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    nationality?: string;
    maritalStatus?: string;
    gender?: string;
    fatherName?: string;
    motherName?: string;
    spouseName?: string;
    panNumber?: string;
    aadharNumber?: string;
    passportNumber?: string;
    passportExpiry?: string;
  };
  documents?: Record<string, any>;
}

interface MarkAsHiredInput {
  candidateId: string;
  tenantSlug: string;
  joiningDate?: Date;
}

export class OnboardingService {
  /**
   * Generate a secure onboarding token
   */
  private static generateOnboardingToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a temporary password for onboarding portal
   */
  private static generateTempPassword(): string {
    // Generate a random 12-character alphanumeric password
    return randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  }

  /**
   * Hash password for storage
   */
  private static hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  /**
   * Start onboarding process for a candidate who accepted an offer
   * Called by HR after candidate accepts offer
   */
  static async startOnboarding(input: StartOnboardingInput) {
    const { candidateId, tenantSlug } = input;
    
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    // Get candidate
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
      include: { job: true },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Verify candidate has accepted the offer
    if (candidate.status !== 'OFFER_ACCEPTED') {
      throw new Error(`Cannot start onboarding - candidate status is ${candidate.status}, expected OFFER_ACCEPTED`);
    }

    // Generate onboarding credentials
    const onboardingToken = this.generateOnboardingToken();
    const tempPassword = this.generateTempPassword();
    const hashedPassword = this.hashPassword(tempPassword);
    
    // Token expires in 7 days
    const onboardingExpiresAt = new Date();
    onboardingExpiresAt.setDate(onboardingExpiresAt.getDate() + 7);

    // Update candidate with onboarding details
    await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'ONBOARDING_IN_PROGRESS',
        stage: 'ONBOARDING',
        onboardingToken,
        onboardingTempPassword: hashedPassword,
        onboardingExpiresAt,
        onboardingStartedAt: new Date(),
      },
    });

    // Get company info for email
    const masterDb = getMasterPrisma();
    const tenant = await masterDb.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        name: true,
        legalName: true,
        logo: true,
        settings: {
          select: {
            primaryColor: true,
          },
        },
      },
    });

    const companyName = tenant?.legalName || tenant?.name || tenantSlug;
    
    // Build onboarding portal URL with tenant subdomain
    const mainDomain = process.env.MAIN_DOMAIN || 'coreorbitsoftware.com';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const frontendUrl = process.env.NODE_ENV === 'development' ? `http://${tenantSlug}.localhost:3000` : `${protocol}://${tenantSlug}.${mainDomain}`;
    const onboardingUrl = `${frontendUrl}/onboarding/${onboardingToken}`;

    // Send onboarding email with temp credentials
    await this.sendOnboardingEmail({
      tenantSlug,
      candidateEmail: candidate.email,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      companyName,
      companyLogo: tenant?.logo,
      primaryColor: tenant?.settings?.primaryColor || '#667eea',
      onboardingUrl,
      tempUsername: candidate.email,
      tempPassword,
      expiresAt: onboardingExpiresAt,
      designation: candidate.offerDesignation || candidate.job.title,
      joiningDate: candidate.offerJoiningDate,
    });

    // Log the onboarding started event
    logger.info({
      event: 'onboarding.started',
      tenantSlug,
      candidateId,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
    }, 'Onboarding started - credentials sent to candidate');

    return {
      success: true,
      message: 'Onboarding started. Temporary credentials have been sent to the candidate.',
      onboardingUrl,
      expiresAt: onboardingExpiresAt,
    };
  }

  /**
   * Resend onboarding email with new credentials
   * Called by HR when candidate didn't receive or lost the email
   */
  static async resendOnboardingEmail(input: StartOnboardingInput) {
    const { candidateId, tenantSlug } = input;
    
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    // Get candidate
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
      include: { job: true },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Verify candidate is in onboarding status
    if (candidate.status !== 'ONBOARDING_IN_PROGRESS') {
      throw new Error(`Cannot resend onboarding email - candidate status is ${candidate.status}, expected ONBOARDING_IN_PROGRESS`);
    }

    // Generate new credentials (for security)
    const onboardingToken = this.generateOnboardingToken();
    const tempPassword = this.generateTempPassword();
    const hashedPassword = this.hashPassword(tempPassword);
    
    // Token expires in 7 days from now
    const onboardingExpiresAt = new Date();
    onboardingExpiresAt.setDate(onboardingExpiresAt.getDate() + 7);

    // Update candidate with new onboarding credentials
    await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        onboardingToken,
        onboardingTempPassword: hashedPassword,
        onboardingExpiresAt,
      },
    });

    // Get company info for email
    const masterDb = getMasterPrisma();
    const tenant = await masterDb.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        name: true,
        legalName: true,
        logo: true,
        settings: {
          select: {
            primaryColor: true,
          },
        },
      },
    });

    const companyName = tenant?.legalName || tenant?.name || tenantSlug;
    
    // Build onboarding portal URL with tenant subdomain
    const resendMainDomain = process.env.MAIN_DOMAIN || 'coreorbitsoftware.com';
    const resendProtocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const resendFrontendUrl = process.env.NODE_ENV === 'development' ? `http://${tenantSlug}.localhost:3000` : `${resendProtocol}://${tenantSlug}.${resendMainDomain}`;
    const onboardingUrl = `${resendFrontendUrl}/onboarding/${onboardingToken}`;

    // Send onboarding email with temp credentials
    await this.sendOnboardingEmail({
      tenantSlug,
      candidateEmail: candidate.email,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      companyName,
      companyLogo: tenant?.logo,
      primaryColor: tenant?.settings?.primaryColor || '#667eea',
      onboardingUrl,
      tempUsername: candidate.email,
      tempPassword,
      expiresAt: onboardingExpiresAt,
      designation: candidate.offerDesignation || candidate.job.title,
      joiningDate: candidate.offerJoiningDate,
    });

    // Log the resend event
    logger.info({
      event: 'onboarding.email_resent',
      tenantSlug,
      candidateId,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
    }, 'Onboarding email resent with new credentials');

    return {
      success: true,
      message: 'New onboarding credentials have been sent to the candidate.',
      onboardingUrl,
      expiresAt: onboardingExpiresAt,
    };
  }

  /**
   * Get onboarding details by token (public - for candidate portal)
   */
  static async getOnboardingByToken(token: string) {
    // Search across all tenant databases
    const masterDb = getMasterPrisma();
    const tenants = await masterDb.tenant.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      select: { 
        slug: true, 
        name: true, 
        legalName: true,
        logo: true,
        settings: {
          select: {
            primaryColor: true,
          },
        },
      },
    });

    for (const tenant of tenants) {
      try {
        const db = await getTenantPrismaBySlug(tenant.slug);
        const candidate = await db.jobCandidate.findFirst({
          where: { onboardingToken: token },
          include: { job: true },
        });

        if (candidate) {
          // Check if onboarding has expired
          if (candidate.onboardingExpiresAt && new Date() > candidate.onboardingExpiresAt) {
            return {
              expired: true,
              message: 'This onboarding link has expired. Please contact HR.',
            };
          }

          // Check if already completed onboarding
          if (candidate.status === 'ONBOARDING_COMPLETED' || candidate.status === 'HIRED') {
            return {
              completed: true,
              message: 'You have already completed the onboarding process.',
            };
          }

          return {
            tenantSlug: tenant.slug,
            companyName: tenant.legalName || tenant.name,
            companyLogo: tenant.logo,
            primaryColor: tenant.settings?.primaryColor || '#667eea',
            candidateId: candidate.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            candidateEmail: candidate.email,
            candidatePhone: candidate.phone,
            designation: candidate.offerDesignation,
            department: candidate.offerDepartment,
            joiningDate: candidate.offerJoiningDate,
            // Existing onboarding data
            address: candidate.onboardingAddress,
            emergencyContact: candidate.onboardingEmergency,
            education: candidate.onboardingEducation,
            bankDetails: candidate.onboardingBankDetails,
            personal: candidate.onboardingPersonal,
            documents: candidate.onboardingDocuments,
            status: candidate.status,
          };
        }
      } catch (error) {
        logger.debug({ tenant: tenant.slug }, 'Onboarding not found in tenant');
      }
    }

    return null;
  }

  /**
   * Authenticate candidate for onboarding portal
   */
  static async authenticateOnboarding(token: string, email: string, password: string) {
    const onboardingDetails = await this.getOnboardingByToken(token);
    
    if (!onboardingDetails) {
      throw new Error('Invalid onboarding link');
    }

    if ('expired' in onboardingDetails) {
      throw new Error('Onboarding link has expired');
    }

    if ('completed' in onboardingDetails) {
      throw new Error('Onboarding already completed');
    }

    const { tenantSlug, candidateId, candidateEmail } = onboardingDetails;

    // Verify email matches
    if (email.toLowerCase() !== candidateEmail.toLowerCase()) {
      throw new Error('Invalid credentials');
    }

    // Get stored password hash
    const db = await getTenantPrismaBySlug(tenantSlug);
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
      select: { onboardingTempPassword: true },
    });

    if (!candidate?.onboardingTempPassword) {
      throw new Error('Onboarding not initialized');
    }

    // Verify password
    const hashedPassword = this.hashPassword(password);
    if (hashedPassword !== candidate.onboardingTempPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      success: true,
      ...onboardingDetails,
    };
  }

  /**
   * Save onboarding details (called by candidate from portal)
   */
  static async saveOnboardingDetails(
    token: string,
    details: OnboardingDetailsInput
  ) {
    const onboardingData = await this.getOnboardingByToken(token);
    
    if (!onboardingData) {
      throw new Error('Invalid onboarding link');
    }

    if ('expired' in onboardingData || 'completed' in onboardingData) {
      throw new Error('Cannot update onboarding details');
    }

    const { tenantSlug, candidateId } = onboardingData;
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Build update data
    const updateData: any = {};
    
    if (details.address) {
      updateData.onboardingAddress = details.address;
    }
    if (details.emergencyContact) {
      updateData.onboardingEmergency = details.emergencyContact;
    }
    if (details.education) {
      updateData.onboardingEducation = details.education;
    }
    if (details.bankDetails) {
      updateData.onboardingBankDetails = details.bankDetails;
    }
    if (details.personal) {
      updateData.onboardingPersonal = details.personal;
    }
    if (details.documents) {
      updateData.onboardingDocuments = details.documents;
    }

    await db.jobCandidate.update({
      where: { id: candidateId },
      data: updateData,
    });

    logger.info({ candidateId }, 'Onboarding details saved');

    return {
      success: true,
      message: 'Details saved successfully',
    };
  }

  /**
   * Upload document for onboarding (called by candidate from public portal)
   */
  static async uploadDocument(token: string, req: any) {
    const onboardingData = await this.getOnboardingByToken(token);
    
    if (!onboardingData) {
      throw new Error('Invalid onboarding link');
    }

    if ('expired' in onboardingData || 'completed' in onboardingData) {
      throw new Error('Cannot upload documents - onboarding not active');
    }

    const { tenantSlug, candidateId, candidateName } = onboardingData;
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Parse multipart form data
    // Using req.files if multer middleware is used, or handle raw body
    const documentType = req.body?.documentType;
    const file = req.files?.file || req.file;

    if (!file) {
      throw new Error('No file uploaded');
    }

    if (!documentType) {
      throw new Error('Document type is required');
    }

    // Store document info in the candidate record
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
    });

    const currentDocs = (candidate?.onboardingDocuments ?? {}) as Record<string, any>;
    
    // Create a file record with path and URL
    const storedFilename = file.filename || file.originalname || file.name;
    const fileRecord = {
      filename: file.originalname || file.name,
      storedFilename,
      path: `/uploads/onboarding/${storedFilename}`,
      url: `/api/v1/public/onboarding/files/${storedFilename}`,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    // Update onboarding documents
    await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        onboardingDocuments: {
          ...currentDocs,
          [documentType]: fileRecord,
        },
      },
    });

    logger.info({
      candidateId,
      documentType,
      filename: fileRecord.filename,
    }, 'Onboarding document uploaded');

    return {
      success: true,
      documentType,
      filename: fileRecord.filename,
      url: fileRecord.url,
    };
  }

  /**
   * Complete onboarding (called by candidate when they submit all details)
   */
  static async completeOnboarding(
    token: string,
    options?: { declarations?: Record<string, boolean>; signature?: string }
  ) {
    const onboardingData = await this.getOnboardingByToken(token);
    
    if (!onboardingData) {
      throw new Error('Invalid onboarding link');
    }

    if ('expired' in onboardingData || 'completed' in onboardingData) {
      throw new Error('Cannot complete onboarding');
    }

    const { tenantSlug, candidateId, candidateName } = onboardingData;
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Validate required fields are filled
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Check if minimum required data is present
    const missingFields: string[] = [];
    if (!candidate.onboardingAddress) missingFields.push('Address');
    if (!candidate.onboardingEmergency) missingFields.push('Emergency Contact');
    // Education and bank details can be optional based on company policy

    if (missingFields.length > 0) {
      throw new Error(`Please complete the following sections: ${missingFields.join(', ')}`);
    }

    // Update status to ONBOARDING_COMPLETED and save declarations
    await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'ONBOARDING_COMPLETED',
        onboardingCompletedAt: new Date(),
        onboardingDeclarations: options?.declarations ? JSON.stringify(options.declarations) : undefined,
        onboardingSignature: options?.signature,
      },
    });

    // Log the onboarding completed event
    logger.info({
      event: 'onboarding.completed',
      tenantSlug,
      candidateId,
      candidateName,
      email: candidate.email,
    }, 'Onboarding completed by candidate');

    return {
      success: true,
      message: 'Onboarding completed successfully. HR will contact you with further instructions.',
    };
  }

  /**
   * Create the default 25-task onboarding checklist for a newly hired employee.
   * Idempotent – skips creation if a checklist already exists.
   */
  private static async createDefaultOnboardingChecklist(db: any, employeeId: string) {
    const existing = await db.onboardingChecklist.findUnique({ where: { employeeId } });
    if (existing) return existing;

    const defaultTasks = [
      // DOCUMENTATION
      { title: 'Submit signed offer letter', description: 'Upload signed copy of offer letter.', category: 'DOCUMENTATION', dueDay: 1, sortOrder: 1 },
      { title: 'Submit government-issued ID proof', description: 'Aadhaar / PAN / Passport copy.', category: 'DOCUMENTATION', dueDay: 1, sortOrder: 2 },
      { title: 'Submit address proof', description: 'Utility bill / rental agreement / bank statement.', category: 'DOCUMENTATION', dueDay: 2, sortOrder: 3 },
      { title: 'Submit educational certificates', description: 'Degree / marksheets / diplomas.', category: 'DOCUMENTATION', dueDay: 3, sortOrder: 4 },
      { title: 'Submit previous employment documents', description: 'Relieving letter, experience letter, last 3-month payslips.', category: 'DOCUMENTATION', dueDay: 5, sortOrder: 5 },
      // PAYROLL
      { title: 'Submit bank account details', description: 'Account number, IFSC, cancelled cheque.', category: 'PAYROLL', dueDay: 2, sortOrder: 6 },
      { title: 'Submit PF / ESI nomination form', description: 'Form 2 for PF nomination.', category: 'PAYROLL', dueDay: 5, sortOrder: 7 },
      // IT_SETUP
      { title: 'Collect laptop / workstation', description: 'Collect assigned hardware from IT team.', category: 'IT_SETUP', dueDay: 1, sortOrder: 8 },
      { title: 'System & email account created', description: 'Official email and system login credentials provided.', category: 'IT_SETUP', dueDay: 1, sortOrder: 9 },
      { title: 'Set up required software & tools', description: 'Install all role-specific software (Slack, VPN, IDEs, etc.).', category: 'IT_SETUP', dueDay: 3, sortOrder: 10 },
      // COMPLIANCE
      { title: 'Sign NDA / confidentiality agreement', description: 'Read and sign the non-disclosure agreement.', category: 'COMPLIANCE', dueDay: 1, sortOrder: 11 },
      { title: 'Sign code of conduct', description: 'Acknowledge company code of conduct policy.', category: 'COMPLIANCE', dueDay: 2, sortOrder: 12 },
      { title: 'Complete POSH awareness', description: 'Complete Prevention of Sexual Harassment orientation.', category: 'COMPLIANCE', dueDay: 7, sortOrder: 13 },
      // TRAINING
      { title: 'Attend company orientation', description: 'Company overview, culture & values session.', category: 'TRAINING', dueDay: 1, sortOrder: 14 },
      { title: 'Complete mandatory policy training', description: 'IT security, leave, expense, and HR policies.', category: 'TRAINING', dueDay: 7, sortOrder: 15 },
      { title: 'Complete role-specific onboarding training', description: 'Department / role-level training plan.', category: 'TRAINING', dueDay: 14, sortOrder: 16 },
      // TEAM_INTRO
      { title: 'Meet reporting manager', description: 'One-on-one with direct manager.', category: 'TEAM_INTRO', dueDay: 1, sortOrder: 17 },
      { title: 'Meet the team', description: 'Introduction with immediate team members.', category: 'TEAM_INTRO', dueDay: 1, sortOrder: 18 },
      { title: 'Buddy / mentor assigned', description: 'HR to assign an onboarding buddy.', category: 'TEAM_INTRO', dueDay: 2, sortOrder: 19 },
      // WORKSPACE
      { title: 'Collect access card / biometric enrollment', description: 'Register fingerprint / collect RFID access card.', category: 'WORKSPACE', dueDay: 1, sortOrder: 20 },
      { title: 'Desk & workspace set up', description: 'Workstation / hot-desk allocated and ready.', category: 'WORKSPACE', dueDay: 1, sortOrder: 21 },
      // OTHER
      { title: 'Update employee profile on HRMS', description: 'Add photo, emergency contact, and address on the portal.', category: 'OTHER', dueDay: 3, sortOrder: 22 },
      { title: '30-day check-in with HR', description: 'Feedback session with HR after first month.', category: 'OTHER', dueDay: 30, sortOrder: 23 },
      { title: '60-day check-in with manager', description: 'Performance and settling-in review session.', category: 'OTHER', dueDay: 60, sortOrder: 24 },
      { title: 'Complete probation review', description: 'Formal probation performance review.', category: 'OTHER', dueDay: 90, sortOrder: 25 },
    ];

    return db.onboardingChecklist.create({
      data: {
        employeeId,
        tasks: {
          create: defaultTasks.map((t) => ({
            title: t.title,
            description: t.description,
            category: t.category,
            dueDay: t.dueDay,
            sortOrder: t.sortOrder,
            status: 'PENDING',
          })),
        },
      },
      include: { tasks: true },
    });
  }

  /**
   * Mark candidate as hired - creates employee record
   * Called by HR after candidate joins the office
   */
  static async markAsHired(input: MarkAsHiredInput) {
    const { candidateId, tenantSlug, joiningDate } = input;
    
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    // Get candidate with all onboarding data
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
      include: { job: true },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Allow marking as hired if offer accepted or onboarding in progress/completed
    const allowedStatuses = ['OFFER_ACCEPTED', 'ONBOARDING_IN_PROGRESS', 'ONBOARDING_COMPLETED'];
    if (!allowedStatuses.includes(candidate.status)) {
      throw new Error(`Cannot mark as hired - candidate status is ${candidate.status}`);
    }

    // Use transaction to ensure all-or-nothing
    const result = await db.$transaction(async (tx: any) => {
      // Create employee record
      const employee = await this.createEmployeeFromCandidate(tx, candidate, tenantSlug);

      // Update candidate to HIRED
      await tx.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'HIRED',
          hiredAt: new Date(),
        },
      });

      // Update job hired count
      await tx.jobDescription.update({
        where: { id: candidate.jobId },
        data: { hired: { increment: 1 } },
      });

      return { employee };
    });

    const { employee } = result;

    // Auto-create the default onboarding checklist for the new employee
    try {
      await this.createDefaultOnboardingChecklist(db, employee.id);
    } catch (checklistErr) {
      logger.warn({ error: (checklistErr as Error).message, employeeId: employee.id }, 'Failed to create onboarding checklist after hire (non-fatal)');
    }

    // Send welcome email
    await this.sendWelcomeEmail({
      tenantSlug,
      employeeEmail: candidate.email,
      employeeName: `${candidate.firstName} ${candidate.lastName}`,
      employeeCode: employee.employeeCode,
      designation: candidate.offerDesignation || candidate.job.title,
      department: candidate.offerDepartment || candidate.job.department,
      joiningDate: joiningDate || candidate.offerJoiningDate || new Date(),
    });

    // Log the employee hired event
    logger.info({
      event: 'employee.hired',
      tenantSlug,
      candidateId,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
    }, 'Candidate marked as hired - employee created');

    // Publish candidate hired event for notifications
    try {
      const masterPrisma = getMasterPrisma();
      const tenant = await masterPrisma.tenant.findFirst({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      
      if (tenant) {
        const eventBus = getEventBus('employee-service');
        await eventBus.publishToTopic('candidate-hired' as any, 'candidate.hired', {
          candidateId,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          jobTitle: candidate.job?.title,
          department: candidate.offerDepartment || candidate.job?.department,
          startDate: joiningDate || candidate.offerJoiningDate,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          tenantSlug, // Include tenantSlug in payload for document service
          tenantId: tenant.id,
        }, { tenantId: tenant.id, tenantSlug });
      }
    } catch (eventError) {
      logger.warn({ error: eventError }, 'Failed to publish candidate hired event');
    }

    return {
      success: true,
      message: 'Employee created successfully. Welcome email has been sent.',
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
      },
    };
  }

  /**
   * Create employee record from hired candidate
   */
  private static async createEmployeeFromCandidate(db: any, candidate: any, tenantSlug: string) {
    // Generate employee code using tenant settings
    const employeeCode = await this.generateEmployeeCode(db, tenantSlug);

    // Fetch tenant settings from master DB for timezone and currency defaults
    const masterPrisma = getMasterPrisma();
    const tenant = await masterPrisma.tenant.findFirst({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    let tenantTimezone = 'UTC';
    let tenantCurrency = 'USD';
    if (tenant) {
      const tenantSettings = await masterPrisma.tenantSettings.findUnique({
        where: { tenantId: tenant.id },
        select: { timezone: true, currency: true },
      });
      tenantTimezone = tenantSettings?.timezone || 'UTC';
      tenantCurrency = tenantSettings?.currency || 'USD';
    }

    // Find department by name
    let departmentId = null;
    if (candidate.offerDepartment) {
      const department = await db.department.findFirst({
        where: {
          OR: [
            { name: candidate.offerDepartment },
            { code: candidate.offerDepartment },
          ],
        },
      });
      departmentId = department?.id;
    }

    // Find designation by title
    let designationId = null;
    if (candidate.offerDesignation) {
      const designation = await db.designation.findFirst({
        where: {
          name: { contains: candidate.offerDesignation, mode: 'insensitive' },
        },
      });
      designationId = designation?.id;

      // If not found, create one
      if (!designationId) {
        const newDesignation = await db.designation.create({
          data: {
            name: candidate.offerDesignation,
            code: candidate.offerDesignation.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
            level: 1,
          },
        });
        designationId = newDesignation.id;
      }
    }

    // Parse onboarding data
    const address = candidate.onboardingAddress as any;
    const emergency = candidate.onboardingEmergency as any;
    const personal = candidate.onboardingPersonal as any;
    const bankDetails = candidate.onboardingBankDetails as any;

    // Map maritalStatus to enum value
    const mapMaritalStatus = (value: string | undefined): string | undefined => {
      if (!value) return undefined;
      const map: Record<string, string> = {
        'Single': 'SINGLE',
        'Married': 'MARRIED',
        'Divorced': 'DIVORCED',
        'Widowed': 'WIDOWED',
        'Other': 'OTHER',
      };
      return map[value] || value.toUpperCase();
    };

    // Map gender to enum value
    const mapGender = (value: string | undefined): string | undefined => {
      if (!value) return undefined;
      const map: Record<string, string> = {
        'Male': 'MALE',
        'Female': 'FEMALE',
        'Other': 'OTHER',
        'Prefer not to say': 'PREFER_NOT_TO_SAY',
      };
      return map[value] || value.toUpperCase();
    };

    // Extract current address (address may have current/permanent structure)
    const currentAddress = address?.current || address;
    const permanentAddress = address?.permanent;

    // Create the employee
    const employee = await db.employee.create({
      data: {
        employeeCode,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        displayName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        personalEmail: candidate.email, // Same as candidate email - can be updated later
        phone: candidate.phone,
        mobile: candidate.phone, // Same as phone initially
        status: 'ONBOARDING',  // Start with ONBOARDING status - will change to ACTIVE when checklist completed
        employmentType: candidate.job.employmentType || 'FULL_TIME',
        joinDate: candidate.offerJoiningDate || new Date(),
        // Work info from job and tenant settings
        workLocation: candidate.job?.location || undefined,
        timezone: tenantTimezone,
        // Salary from offer
        baseSalary: candidate.offerSalary || undefined,
        currency: candidate.offerCurrency || tenantCurrency,
        // Address from onboarding (current address)
        ...(currentAddress && {
          addressLine1: currentAddress.street,
          city: currentAddress.city,
          state: currentAddress.state,
          postalCode: currentAddress.postalCode,
          country: currentAddress.country,
        }),
        // Personal details from onboarding
        ...(personal && {
          dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth) : null,
          bloodGroup: personal.bloodGroup,
          nationality: personal.nationality,
          maritalStatus: mapMaritalStatus(personal.maritalStatus),
          gender: mapGender(personal.gender),
        }),
        // Connect to department if exists
        ...(departmentId && {
          department: { connect: { id: departmentId } },
        }),
        // Connect to designation if exists
        ...(designationId && {
          designation: { connect: { id: designationId } },
        }),
        // Set probation end date to 3 months from join date
        probationEndDate: new Date(
          (candidate.offerJoiningDate || new Date()).getTime() + 90 * 24 * 60 * 60 * 1000
        ),
        // Store hiring source and additional onboarding data in metadata
        metadata: {
          source: 'INTERNAL_HIRING',
          candidateId: candidate.id,
          hiredFrom: 'JOB_OFFER',
          // Additional personal info not in employee schema
          personalInfo: personal ? {
            panNumber: personal.panNumber,
            aadharNumber: personal.aadharNumber,
            fatherName: personal.fatherName,
            motherName: personal.motherName,
            spouseName: personal.spouseName,
            passportNumber: personal.passportNumber,
            passportExpiry: personal.passportExpiry,
          } : undefined,
          // Permanent address if different from current
          permanentAddress: permanentAddress && !address?.sameAsCurrent ? permanentAddress : undefined,
          onboardingData: {
            education: candidate.onboardingEducation,
            documents: candidate.onboardingDocuments,
          },
        },
      },
    });

    // Create emergency contact if provided
    if (emergency) {
      await db.emergencyContact.create({
        data: {
          employeeId: employee.id,
          name: emergency.name,
          relationship: emergency.relationship,
          phone: emergency.phone,
          email: emergency.email || undefined,
          address: emergency.address || undefined,
          isPrimary: true,
        },
      });
    }

    // Create bank details if provided
    if (bankDetails) {
      // Map account type to enum
      const mapAccountType = (type: string | undefined): string => {
        if (!type) return 'SAVINGS';
        const map: Record<string, string> = {
          'savings': 'SAVINGS',
          'checking': 'CHECKING',
          'current': 'CURRENT',
        };
        return map[type.toLowerCase()] || 'SAVINGS';
      };

      await db.bankDetail.create({
        data: {
          employeeId: employee.id,
          accountNumber: bankDetails.accountNumber,
          bankName: bankDetails.bankName,
          branchName: bankDetails.branchName,
          ifscCode: bankDetails.ifscCode,
          accountType: mapAccountType(bankDetails.accountType),
          isPrimary: true,
        },
      });
    }

    // Create education records if provided
    const education = candidate.onboardingEducation as any[];
    if (education && Array.isArray(education)) {
      // Map degree string to education type enum (for backward compatibility with old format)
      const mapEducationType = (edu: any): string => {
        // If new format with educationType enum, use it directly
        if (edu.educationType && ['HIGH_SCHOOL', 'INTERMEDIATE', 'DIPLOMA', 'BACHELORS', 'MASTERS', 'DOCTORATE', 'POST_DOCTORATE', 'CERTIFICATION', 'VOCATIONAL', 'OTHER'].includes(edu.educationType)) {
          return edu.educationType;
        }
        // Otherwise, infer from degree string (old format)
        const degree = edu.degree || '';
        const degreeLower = degree.toLowerCase();
        if (degreeLower.includes('ssc') || degreeLower.includes('10th') || degreeLower.includes('high school')) return 'HIGH_SCHOOL';
        if (degreeLower.includes('hsc') || degreeLower.includes('12th') || degreeLower.includes('intermediate')) return 'INTERMEDIATE';
        if (degreeLower.includes('diploma')) return 'DIPLOMA';
        if (degreeLower.includes('bachelor') || degreeLower.includes('b.tech') || degreeLower.includes('b.e') || degreeLower.includes('bca') || degreeLower.includes('bsc')) return 'BACHELORS';
        if (degreeLower.includes('master') || degreeLower.includes('m.tech') || degreeLower.includes('m.e') || degreeLower.includes('mca') || degreeLower.includes('msc') || degreeLower.includes('mba')) return 'MASTERS';
        if (degreeLower.includes('phd') || degreeLower.includes('doctorate')) return 'DOCTORATE';
        if (degreeLower.includes('certificate') || degreeLower.includes('certification')) return 'CERTIFICATION';
        return 'OTHER';
      };

      // Map institution type (default to UNIVERSITY)
      const mapInstitutionType = (edu: any): string => {
        if (edu.institutionType && ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'INSTITUTE', 'ONLINE', 'OTHER'].includes(edu.institutionType)) {
          return edu.institutionType;
        }
        return 'UNIVERSITY';
      };

      // Map grade type (default to PERCENTAGE)
      const mapGradeType = (edu: any): string => {
        if (edu.gradeType && ['PERCENTAGE', 'CGPA_10', 'CGPA_4', 'GRADE_LETTER', 'DIVISION', 'PASS_FAIL'].includes(edu.gradeType)) {
          return edu.gradeType;
        }
        return 'PERCENTAGE';
      };

      for (const edu of education) {
        await db.employeeEducation.create({
          data: {
            employeeId: employee.id,
            educationType: mapEducationType(edu),
            institutionType: mapInstitutionType(edu),
            institutionName: edu.institutionName || edu.institution, // Support both new and old field names
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy || undefined,
            specialization: edu.specialization || undefined,
            enrollmentYear: edu.enrollmentYear || edu.year || new Date().getFullYear(),
            completionYear: edu.completionYear || undefined,
            isOngoing: edu.isOngoing || false,
            gradeType: mapGradeType(edu),
            grade: edu.grade?.toString() || undefined,
            percentage: edu.percentage ? parseFloat(edu.percentage) : undefined,
            boardUniversity: edu.boardUniversity || edu.board || undefined,
          },
        });
      }
    }

    return employee;
  }

  /**
   * Get employee code settings from tenant settings
   */
  private static async getEmployeeCodeSettings(tenantSlug: string) {
    const masterPrisma = getMasterPrisma();
    
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { settings: true },
    });
    
    const settings = tenant?.settings as any;
    
    return {
      autoGenerate: settings?.employeeCodeAutoGenerate ?? true,
      prefix: settings?.employeeCodePrefix || 'EMP',
      includeYear: settings?.employeeCodeIncludeYear ?? false,
      yearSeqDigits: settings?.employeeCodeYearSeqDigits ?? 5,
      totalSeqDigits: settings?.employeeCodeTotalSeqDigits ?? 5,
      separator: settings?.employeeCodeSeparator ?? '-',
    };
  }

  /**
   * Generate employee code using tenant settings
   */
  private static async generateEmployeeCode(prisma: any, tenantSlug: string): Promise<string> {
    // Get tenant-specific settings
    const settings = await this.getEmployeeCodeSettings(tenantSlug);
    
    if (!settings.autoGenerate) {
      // Fallback to simple sequential if auto-generate is disabled
      const count = await prisma.employee.count();
      return `EMP${String(count + 1).padStart(4, '0')}`;
    }
    
    const { prefix, separator, includeYear, yearSeqDigits, totalSeqDigits } = settings;
    const currentYear = new Date().getFullYear();
    
    // Count total employees (always needed)
    const totalEmployees = await prisma.employee.count();
    const totalSeq = String(totalEmployees + 1).padStart(totalSeqDigits, '0');
    
    if (includeYear) {
      // Full format: PREFIX-YEAR-YEAR_SEQ-TOTAL_SEQ (e.g., EMP-2026-00001-00001)
      const employeesThisYear = await prisma.employee.count({
        where: {
          createdAt: {
            gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
          },
        },
      });
      const yearSeq = String(employeesThisYear + 1).padStart(yearSeqDigits, '0');
      return `${prefix}${separator}${currentYear}${separator}${yearSeq}${separator}${totalSeq}`;
    } else {
      // Simple format: PREFIX-TOTAL_SEQ (e.g., EMP-00001)
      return `${prefix}${separator}${totalSeq}`;
    }
  }

  /**
   * Send onboarding email with temp credentials
   */
  private static async sendOnboardingEmail(data: {
    tenantSlug: string;
    candidateEmail: string;
    candidateName: string;
    companyName: string;
    companyLogo?: string | null;
    primaryColor: string;
    onboardingUrl: string;
    tempUsername: string;
    tempPassword: string;
    expiresAt: Date;
    designation?: string | null;
    joiningDate?: Date | null;
  }): Promise<boolean> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
      
      const expiryDate = data.expiresAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const joiningDateStr = data.joiningDate 
        ? new Date(data.joiningDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'To be confirmed';

      const logoSection = data.companyLogo 
        ? `<div style="text-align: center; padding: 20px;">
            <img src="${data.companyLogo}" alt="${data.companyName}" style="max-height: 60px; max-width: 200px;" />
           </div>`
        : `<div style="text-align: center; padding: 20px;">
            <h2 style="color: ${data.primaryColor}; margin: 0;">${data.companyName}</h2>
           </div>`;

      const subject = `Complete Your Onboarding - ${data.companyName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          ${logoSection}
          <div style="background: linear-gradient(135deg, ${data.primaryColor} 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">📋 Complete Your Onboarding</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1a202c;">Hello ${data.candidateName},</h2>
            <p style="color: #4a5568; font-size: 16px;">
              Welcome to <strong>${data.companyName}</strong>! We're excited to have you join us as <strong>${data.designation || 'a team member'}</strong>.
            </p>
            <p style="color: #4a5568; font-size: 16px;">
              Please complete your onboarding by filling in your personal details, emergency contacts, and uploading required documents.
            </p>
            
            <div style="background: white; border-left: 4px solid ${data.primaryColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #1a202c; margin-top: 0;">Your Temporary Credentials:</h3>
              <p><strong>Username:</strong> ${data.tempUsername}</p>
              <p><strong>Password:</strong> ${data.tempPassword}</p>
              <p style="color: #e53e3e; font-size: 14px;">⚠️ This link expires on ${expiryDate}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.onboardingUrl}" style="background: ${data.primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Complete Onboarding
              </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 4px; margin-top: 20px;">
              <h4 style="color: #1a202c; margin-top: 0;">What you'll need to provide:</h4>
              <ul style="color: #4a5568;">
                <li>Personal Information (Address, Date of Birth, etc.)</li>
                <li>Emergency Contact Details</li>
                <li>Education History</li>
                <li>Bank Account Details for Salary</li>
                <li>Required Documents (ID Proof, Address Proof, etc.)</li>
              </ul>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 20px;">
              Expected Joining Date: <strong>${joiningDateStr}</strong>
            </p>
          </div>
          <div style="background: #2d3748; padding: 20px; text-align: center;">
            <p style="color: #a0aec0; margin: 0; font-size: 14px;">
              Questions? Contact HR at ${data.companyName}
            </p>
          </div>
        </div>
      `;

      const response = await fetch(`${notificationServiceUrl}/api/notifications/tenant/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': data.tenantSlug,
        },
        body: JSON.stringify({
          to: data.candidateEmail,
          subject,
          message: `Welcome to ${data.companyName}! Please complete your onboarding at ${data.onboardingUrl}`,
          html,
        }),
      });

      const responseData = await response.json().catch(() => ({})) as any;
      
      if (!response.ok || !responseData.success) {
        logger.error({ status: response.status, responseData }, 'Failed to send onboarding email');
        return false;
      }

      logger.info({ email: data.candidateEmail }, 'Onboarding email sent successfully');
      return true;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error sending onboarding email');
      return false;
    }
  }

  /**
   * Send welcome email to new employee
   */
  private static async sendWelcomeEmail(data: {
    tenantSlug: string;
    employeeEmail: string;
    employeeName: string;
    employeeCode: string;
    designation?: string | null;
    department?: string | null;
    joiningDate: Date;
  }): Promise<boolean> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
      
      // Get company info
      const masterDb = getMasterPrisma();
      const tenant = await masterDb.tenant.findUnique({
        where: { slug: data.tenantSlug },
        select: {
          name: true,
          legalName: true,
          logo: true,
          settings: {
            select: {
              primaryColor: true,
            },
          },
        },
      });

      const companyName = tenant?.legalName || tenant?.name || data.tenantSlug;
      const primaryColor = tenant?.settings?.primaryColor || '#667eea';
      const welcomeMainDomain = process.env.MAIN_DOMAIN || 'coreorbitsoftware.com';
      const welcomeProtocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const portalUrl = process.env.NODE_ENV === 'development'
        ? `http://${data.tenantSlug}.localhost:3000`
        : `${welcomeProtocol}://${data.tenantSlug}.${welcomeMainDomain}`;

      const joiningDateStr = new Date(data.joiningDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const logoSection = tenant?.logo 
        ? `<div style="text-align: center; padding: 20px;">
            <img src="${tenant.logo}" alt="${companyName}" style="max-height: 60px; max-width: 200px;" />
           </div>`
        : `<div style="text-align: center; padding: 20px;">
            <h2 style="color: ${primaryColor}; margin: 0;">${companyName}</h2>
           </div>`;

      const subject = `Welcome to ${companyName}! 🎉`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          ${logoSection}
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Welcome Aboard!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">You're officially part of the team!</p>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1a202c;">Hello ${data.employeeName},</h2>
            <p style="color: #4a5568; font-size: 16px;">
              On behalf of everyone at <strong>${companyName}</strong>, we're thrilled to welcome you to our team!
            </p>
            
            <div style="background: white; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #1a202c; margin-top: 0;">Your Employee Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Employee Code:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: bold;">${data.employeeCode}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Designation:</td>
                  <td style="padding: 8px 0; color: #1a202c;">${data.designation || 'To be updated'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Department:</td>
                  <td style="padding: 8px 0; color: #1a202c;">${data.department || 'To be updated'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Joining Date:</td>
                  <td style="padding: 8px 0; color: #1a202c;">${joiningDateStr}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}/login" style="background: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Access Employee Portal
              </a>
            </div>
            
            <div style="background: #edf2f7; padding: 20px; border-radius: 4px; margin-top: 20px;">
              <h4 style="color: #1a202c; margin-top: 0;">📝 First Day Checklist:</h4>
              <ul style="color: #4a5568; margin-bottom: 0;">
                <li>Report to HR at 9:00 AM</li>
                <li>Carry original documents for verification</li>
                <li>Collect your ID card and welcome kit</li>
                <li>Complete IT setup and system access</li>
              </ul>
            </div>
          </div>
          <div style="background: #2d3748; padding: 20px; text-align: center;">
            <p style="color: #a0aec0; margin: 0; font-size: 14px;">
              We're excited to have you on board! 🚀<br/>
              Team ${companyName}
            </p>
          </div>
        </div>
      `;

      const response = await fetch(`${notificationServiceUrl}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': data.tenantSlug,
        },
        body: JSON.stringify({
          type: 'EMAIL',
          to: data.employeeEmail,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        logger.error({ status: response.status }, 'Failed to send welcome email');
        return false;
      }

      logger.info({ email: data.employeeEmail }, 'Welcome email sent successfully');
      return true;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error sending welcome email');
      return false;
    }
  }

  /**
   * Get candidates ready for onboarding (OFFER_ACCEPTED status)
   */
  static async getCandidatesReadyForOnboarding(tenantSlug: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    return db.jobCandidate.findMany({
      where: { status: 'OFFER_ACCEPTED' },
      include: { job: true },
      orderBy: { offerRespondedAt: 'desc' },
    });
  }

  /**
   * Get candidates in onboarding (ONBOARDING_IN_PROGRESS status)
   */
  static async getCandidatesInOnboarding(tenantSlug: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    return db.jobCandidate.findMany({
      where: { status: 'ONBOARDING_IN_PROGRESS' },
      include: { job: true },
      orderBy: { onboardingStartedAt: 'desc' },
    });
  }

  /**
   * Get candidates ready to be hired (ONBOARDING_COMPLETED status)
   */
  static async getCandidatesReadyToHire(tenantSlug: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    
    return db.jobCandidate.findMany({
      where: { status: 'ONBOARDING_COMPLETED' },
      include: { job: true },
      orderBy: { onboardingCompletedAt: 'desc' },
    });
  }
}
