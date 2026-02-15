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

interface StartOnboardingInput {
  candidateId: string;
  tenantSlug: string;
}

interface OnboardingDetailsInput {
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
    grade?: string;
  }>;
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    accountHolderName: string;
  };
  personal?: {
    dateOfBirth?: string;
    bloodGroup?: string;
    nationality?: string;
    maritalStatus?: string;
    gender?: string;
  };
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
    
    // Build onboarding portal URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
   * Complete onboarding (called by candidate when they submit all details)
   */
  static async completeOnboarding(token: string) {
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

    // Update status to ONBOARDING_COMPLETED
    await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'ONBOARDING_COMPLETED',
        onboardingCompletedAt: new Date(),
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

    // Create the employee
    const employee = await db.employee.create({
      data: {
        employeeCode,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        displayName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone,
        status: 'ACTIVE',
        employmentType: candidate.job.employmentType || 'FULL_TIME',
        joinDate: candidate.offerJoiningDate || new Date(),
        // Address from onboarding
        ...(address && {
          addressLine1: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        }),
        // Personal details from onboarding
        ...(personal && {
          dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth) : null,
          bloodGroup: personal.bloodGroup,
          nationality: personal.nationality,
          maritalStatus: personal.maritalStatus,
          gender: personal.gender,
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
        // Store hiring source in metadata
        metadata: {
          source: 'INTERNAL_HIRING',
          candidateId: candidate.id,
          hiredFrom: 'JOB_OFFER',
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
          email: emergency.email,
          isPrimary: true,
        },
      });
    }

    // Create bank details if provided
    if (bankDetails) {
      await db.bankDetails.create({
        data: {
          employeeId: employee.id,
          accountNumber: bankDetails.accountNumber,
          bankName: bankDetails.bankName,
          ifscCode: bankDetails.ifscCode,
          accountHolderName: bankDetails.accountHolderName,
          isPrimary: true,
        },
      });
    }

    // Create education records if provided
    const education = candidate.onboardingEducation as any[];
    if (education && Array.isArray(education)) {
      for (const edu of education) {
        await db.employeeEducation.create({
          data: {
            employeeId: employee.id,
            degree: edu.degree,
            institution: edu.institution,
            year: edu.year,
            grade: edu.grade,
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
      yearSeqDigits: settings?.employeeCodeYearSeqDigits ?? 5,
      totalSeqDigits: settings?.employeeCodeTotalSeqDigits ?? 5,
      separator: settings?.employeeCodeSeparator || '-',
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
    
    const { prefix, separator, yearSeqDigits, totalSeqDigits } = settings;
    const currentYear = new Date().getFullYear();
    
    // Count employees created this year (for year sequence)
    const employeesThisYear = await prisma.employee.count({
      where: {
        createdAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
        },
      },
    });
    
    // Count total employees (for total sequence)
    const totalEmployees = await prisma.employee.count();
    
    // Generate code: {PREFIX}-{YYYY}-{YEAR_SEQ}-{TOTAL_SEQ}
    const yearSeq = String(employeesThisYear + 1).padStart(yearSeqDigits, '0');
    const totalSeq = String(totalEmployees + 1).padStart(totalSeqDigits, '0');
    
    return `${prefix}${separator}${currentYear}${separator}${yearSeq}${separator}${totalSeq}`;
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

      const response = await fetch(`${notificationServiceUrl}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': data.tenantSlug,
        },
        body: JSON.stringify({
          type: 'EMAIL',
          to: data.candidateEmail,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        logger.error({ status: response.status }, 'Failed to send onboarding email');
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
      const portalUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

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
