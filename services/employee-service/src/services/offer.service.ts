/**
 * Offer Service - Handles job offer operations
 */

import { randomBytes } from 'crypto';
import { getTenantPrismaBySlug, getMasterPrisma } from '../utils/database';
import { logger } from '../utils/logger';
import { OfferPdfService } from './offer-pdf.service';

interface SendOfferInput {
  candidateId: string;
  jobId: string;
  salary: number;
  currency: string;
  joiningDate: Date;
  designation?: string;
  department?: string;
  additionalTerms?: string;
}

interface RespondOfferInput {
  token: string;
  response: 'ACCEPTED' | 'REJECTED';
  signature?: string;
  termsAccepted?: boolean;
}

export class OfferService {
  /**
   * Generate a secure offer token
   */
  private static generateOfferToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get standard offer terms and conditions
   */
  static async getOfferTerms(tenantSlug: string): Promise<string> {
    // In the future, this could be tenant-specific from database
    return `
OFFER LETTER TERMS AND CONDITIONS

1. EMPLOYMENT TERMS
This offer of employment is contingent upon successful completion of background verification and reference checks. The company reserves the right to withdraw this offer if any discrepancies are found.

2. COMPENSATION
Your compensation package includes the base salary as mentioned in this offer. Additional benefits, bonuses, and incentives will be as per company policy and will be communicated during your onboarding.

3. PROBATION PERIOD
You will be on probation for a period of 3 months from your date of joining. During this period, either party may terminate the employment with a notice period of 7 days.

4. CONFIDENTIALITY
You agree to maintain strict confidentiality regarding all company proprietary information, trade secrets, and business strategies during and after your employment.

5. NON-COMPETE
During your employment and for a period of 6 months after termination, you agree not to engage in any business that directly competes with the company's core business.

6. INTELLECTUAL PROPERTY
All work products, inventions, and intellectual property created during your employment shall be the sole property of the company.

7. CODE OF CONDUCT
You agree to abide by the company's code of conduct, policies, and procedures as communicated during onboarding and as amended from time to time.

8. AT-WILL EMPLOYMENT
Your employment is at-will, meaning either you or the company may terminate the employment relationship at any time, with or without cause, subject to applicable notice period requirements.

9. DOCUMENTATION
You are required to submit all necessary documents including identity proof, address proof, educational certificates, and previous employment documents within 7 days of joining.

10. ACCEPTANCE
By signing this offer letter, you confirm that you have read, understood, and agree to all the terms and conditions mentioned herein.

This offer is valid until the expiry date mentioned in the offer letter.
    `.trim();
  }

  /**
   * Send offer email via notification service
   */
  private static async sendOfferEmail(data: {
    tenantSlug: string;
    candidateEmail: string;
    candidateName: string;
    jobTitle: string;
    department: string;
    salary: number;
    currency: string;
    joiningDate: Date;
    designation: string;
    offerUrl: string;
    expiresAt: Date;
    companyName: string;
    companyLogo?: string | null;
    primaryColor?: string;
  }): Promise<boolean> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
      const primaryColor = data.primaryColor || '#667eea';
      
      // Format salary with currency
      const formattedSalary = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: data.currency,
        maximumFractionDigits: 0,
      }).format(data.salary);

      // Format dates
      const joiningDate = new Date(data.joiningDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const expiryDate = data.expiresAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const subject = `Job Offer - ${data.designation} at ${data.companyName}`;
      
      // Build logo HTML - displayed at top of email, outside the main content
      const logoSection = data.companyLogo 
        ? `<div style="background: #ffffff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            <img src="${data.companyLogo}" alt="${data.companyName}" style="max-height: 60px; max-width: 200px;" />
           </div>`
        : `<div style="background: #ffffff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: ${primaryColor}; margin: 0; font-size: 24px;">${data.companyName}</h2>
           </div>`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          ${logoSection}
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You've received a job offer!</p>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1a202c;">Hello ${data.candidateName},</h2>
            <p style="color: #4a5568; font-size: 16px;">
              We are pleased to extend an offer of employment to you at <strong>${data.companyName}</strong>. We were impressed by your skills and qualifications throughout the interview process.
            </p>
            
            <div style="background: white; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #1a202c; margin-top: 0;">Offer Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #718096; width: 140px;">Position:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">${data.designation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Department:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">${data.department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Annual Salary:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">${formattedSalary}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Start Date:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">${joiningDate}</td>
                </tr>
              </table>
            </div>

            <p style="color: #4a5568; font-size: 16px;">
              To respond to this offer, please click the button below. You will be able to review the complete terms and conditions, and accept or decline the offer.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.offerUrl}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: 600;">
                View & Respond to Offer
              </a>
            </div>

            <div style="background: #fffaf0; border-left: 4px solid #ed8936; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #c05621; margin: 0;">
                <strong>⏰ Important:</strong> This offer is valid until <strong>${expiryDate}</strong>. Please respond before the deadline.
              </p>
            </div>

            <p style="color: #718096; font-size: 14px;">
              If you have any questions, please don't hesitate to reach out to our HR team.
            </p>

            <p style="color: #4a5568;">
              Best regards,<br>
              <strong>HR Team - ${data.companyName}</strong>
            </p>
          </div>
          <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            ${data.companyLogo ? `<img src="${data.companyLogo}" alt="${data.companyName}" style="max-height: 40px; opacity: 0.7; margin-bottom: 10px;" />` : ''}
            <p style="color: #718096; font-size: 12px; margin: 0;">
              This is an automated email from ${data.companyName}. Please do not reply directly to this message.
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
          html,
          message: `Congratulations ${data.candidateName}! You have received a job offer for ${data.designation}. Click here to respond: ${data.offerUrl}`,
        }),
      });

      const result = await response.json();
      logger.info({ email: data.candidateEmail, success: result.success }, 'Offer email sent');
      return result.success === true;
    } catch (error: any) {
      logger.error({ error: error.message, candidateEmail: data.candidateEmail }, 'Failed to send offer email');
      return false;
    }
  }

  /**
   * Send offer to candidate
   */
  static async sendOffer(tenantSlug: string, input: SendOfferInput) {
    const db = await getTenantPrismaBySlug(tenantSlug);
    const masterDb = getMasterPrisma();

    // Get tenant details for branding
    const tenant = await masterDb.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        name: true,
        legalName: true,
        reportLogo: true,
        logo: true,
        settings: {
          select: {
            primaryColor: true,
          },
        },
      },
    });

    // Get candidate with job details
    const candidate = await db.jobCandidate.findFirst({
      where: {
        id: input.candidateId,
        jobId: input.jobId,
      },
      include: {
        job: true,
      },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Check if candidate is in a valid status for offer
    // Allow resending offers to: INTERVIEWED, SHORTLISTED, OFFERED
    // Also allow re-offering to: WITHDRAWN, REJECTED (gives flexibility to reconsider)
    // Only block: HIRED (already employed)
    const blockedStatuses = ['HIRED'];
    if (blockedStatuses.includes(candidate.status)) {
      throw new Error(`Cannot send offer to candidate with status ${candidate.status}. Candidate is already hired.`);
    }

    // Generate new offer token (valid for 7 days)
    const offerToken = this.generateOfferToken();
    const offerExpiresAt = new Date();
    offerExpiresAt.setDate(offerExpiresAt.getDate() + 7);

    // Update candidate with offer details (this replaces any previous offer)
    const updatedCandidate = await db.jobCandidate.update({
      where: { id: input.candidateId },
      data: {
        status: 'OFFERED',
        stage: 'OFFER',
        offeredAt: new Date(),
        offerToken,
        offerExpiresAt,
        offerSalary: input.salary,
        offerCurrency: input.currency,
        offerJoiningDate: input.joiningDate,
        offerDesignation: input.designation || candidate.job.title,
        offerDepartment: input.department || candidate.job.department,
        // Reset response fields when resending (allows re-offering to rejected/withdrawn)
        offerResponse: null,
        offerRespondedAt: null,
        offerSignature: null,
        offerTermsAccepted: false,
        // Clear rejection timestamp when re-offering
        rejectedAt: null,
      },
    });

    // Build offer response URL with tenant subdomain
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Parse the base URL to insert tenant subdomain
    const url = new URL(baseUrl);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    
    let offerUrl: string;
    if (isLocalhost) {
      // For localhost, use subdomain format: tenant.localhost:port
      offerUrl = `${url.protocol}//${tenantSlug}.localhost:${url.port || (url.protocol === 'https:' ? '443' : '80')}/offer/${offerToken}`;
    } else {
      // For production, prepend tenant subdomain
      offerUrl = `${url.protocol}//${tenantSlug}.${url.host}/offer/${offerToken}`;
    }

    // Get company branding info
    const companyName = tenant?.legalName || tenant?.name || tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1);
    const companyLogo = tenant?.reportLogo || tenant?.logo;
    const primaryColor = tenant?.settings?.primaryColor || '#667eea';

    // Send offer email via notification service
    const emailSent = await this.sendOfferEmail({
      tenantSlug,
      candidateEmail: candidate.email,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: candidate.job.title,
      department: input.department || candidate.job.department,
      salary: input.salary,
      currency: input.currency,
      joiningDate: input.joiningDate,
      designation: input.designation || candidate.job.title,
      offerUrl,
      expiresAt: offerExpiresAt,
      companyName,
      companyLogo,
      primaryColor,
    });

    if (!emailSent) {
      logger.warn({ candidateId: input.candidateId, candidateEmail: candidate.email }, 'Offer email failed to send but offer was created');
    }

    logger.info({ candidateId: input.candidateId, offerToken, emailSent }, 'Offer sent to candidate');

    return {
      candidateId: updatedCandidate.id,
      status: updatedCandidate.status,
      offerUrl,
      expiresAt: offerExpiresAt,
    };
  }

  /**
   * Get offer details by token (public - no auth required)
   */
  static async getOfferByToken(token: string) {
    // We need to search across all tenant databases
    // For now, we'll store the tenant slug in a lookup table or include it in the token
    // Alternatively, we can iterate through tenant databases
    
    // For simplicity, we'll search in all tenant databases
    const masterDb = getMasterPrisma();
    const tenants = await masterDb.tenant.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      select: { 
        slug: true, 
        name: true, 
        legalName: true,
        reportLogo: true,
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
          where: { offerToken: token },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
                employmentType: true,
              },
            },
          },
        });

        if (candidate) {
          // Check if offer has expired
          if (candidate.offerExpiresAt && new Date() > candidate.offerExpiresAt) {
            return {
              expired: true,
              message: 'This offer has expired',
            };
          }

          // Check if offer already responded
          if (candidate.offerResponse) {
            return {
              alreadyResponded: true,
              response: candidate.offerResponse,
              message: `You have already ${candidate.offerResponse.toLowerCase()} this offer`,
            };
          }

          return {
            tenantSlug: tenant.slug,
            companyName: tenant.legalName || tenant.name,
            companyLogo: tenant.reportLogo || tenant.logo,
            primaryColor: tenant.settings?.primaryColor || '#667eea',
            candidateId: candidate.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            candidateEmail: candidate.email,
            jobTitle: candidate.job.title,
            department: candidate.offerDepartment || candidate.job.department,
            location: candidate.job.location,
            employmentType: candidate.job.employmentType,
            designation: candidate.offerDesignation,
            salary: candidate.offerSalary,
            currency: candidate.offerCurrency,
            joiningDate: candidate.offerJoiningDate,
            expiresAt: candidate.offerExpiresAt,
            status: candidate.status,
          };
        }
      } catch (error) {
        // Continue to next tenant
        logger.debug({ tenant: tenant.slug }, 'Offer not found in tenant');
      }
    }

    return null;
  }

  /**
   * Respond to offer (accept/reject) - public endpoint
   */
  static async respondToOffer(token: string, input: RespondOfferInput) {
    // Find the offer across tenants
    const offerDetails = await this.getOfferByToken(token);

    if (!offerDetails) {
      throw new Error('Offer not found');
    }

    if ('expired' in offerDetails && offerDetails.expired) {
      throw new Error('Offer has expired');
    }

    if ('alreadyResponded' in offerDetails && offerDetails.alreadyResponded) {
      throw new Error(`Offer already ${offerDetails.response?.toLowerCase()}`);
    }

    const { tenantSlug, candidateId } = offerDetails as {
      tenantSlug: string;
      candidateId: string;
    };

    const db = await getTenantPrismaBySlug(tenantSlug);

    // Get full candidate details
    const candidate = await db.jobCandidate.findUnique({
      where: { id: candidateId },
      include: {
        job: true,
      },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    if (input.response === 'ACCEPTED') {
      // Require signature and terms acceptance for accepting
      if (!input.signature) {
        throw new Error('Signature is required to accept the offer');
      }
      if (!input.termsAccepted) {
        throw new Error('You must accept the terms and conditions');
      }

      // Get company info for PDF BEFORE transaction (read-only)
      const masterDb = getMasterPrisma();
      const tenant = await masterDb.tenant.findUnique({
        where: { slug: tenantSlug },
        select: {
          name: true,
          legalName: true,
          reportLogo: true,
          logo: true,
          settings: {
            select: {
              primaryColor: true,
            },
          },
        },
      });

      // Get terms and conditions
      const terms = await this.getOfferTerms(tenantSlug);

      // Prepare PDF data
      const pdfData = {
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        candidateEmail: candidate.email,
        designation: candidate.offerDesignation || candidate.job.title,
        department: candidate.offerDepartment || candidate.job.department,
        salary: candidate.offerSalary,
        currency: candidate.offerCurrency || 'INR',
        joiningDate: candidate.offerJoiningDate || new Date(),
        companyName: tenant?.legalName || tenant?.name || tenantSlug,
        companyLogo: tenant?.reportLogo || tenant?.logo,
        primaryColor: tenant?.settings?.primaryColor || '#3B82F6',
        signature: input.signature,
        termsAndConditions: terms,
        acceptedAt: new Date(),
      };

      // Generate PDF BEFORE transaction - if this fails, nothing is saved
      const { buffer, htmlBuffer, filename } = await OfferPdfService.generateOfferLetterPdf(pdfData);

      // Store PDF in on-boarding folder BEFORE transaction - if this fails, nothing is saved
      const candidateName = `${candidate.firstName} ${candidate.lastName}`;
      const storedDoc = await OfferPdfService.storeOfferPdf(
        tenantSlug,
        null, // No employee ID yet
        candidateId,
        buffer,
        filename,
        candidateName,
        htmlBuffer // Also pass HTML buffer for web preview
      );

      if (!storedDoc) {
        throw new Error('Failed to store offer letter PDF. Please try again.');
      }

      // Use transaction to update database - all or nothing
      await db.$transaction(async (tx: any) => {
        // Update candidate to OFFER_ACCEPTED status with offer letter URL
        await tx.jobCandidate.update({
          where: { id: candidateId },
          data: {
            status: 'OFFER_ACCEPTED',
            stage: 'OFFER',
            offerResponse: 'ACCEPTED',
            offerRespondedAt: new Date(),
            offerSignature: input.signature,
            offerTermsAccepted: true,
            offerLetterUrl: storedDoc.fileId,
          },
        });
      });

      logger.info({
        event: 'offer.accepted',
        tenantSlug,
        candidateId,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        joiningDate: candidate.offerJoiningDate,
        offerLetterUrl: storedDoc.fileId,
      }, 'Offer accepted - PDF stored, waiting for HR to start onboarding');

      return {
        success: true,
        response: 'ACCEPTED',
        message: 'Congratulations! You have accepted the offer. HR will contact you soon with onboarding details.',
      };
    } else {
      // REJECTED
      await db.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'WITHDRAWN',
          offerResponse: 'REJECTED',
          offerRespondedAt: new Date(),
        },
      });

      // Log the offer rejection event
      logger.info({
        event: 'offer.rejected',
        tenantSlug,
        candidateId,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
      }, 'Offer rejected by candidate');

      return {
        success: true,
        response: 'REJECTED',
        message: 'You have declined the offer. We wish you all the best!',
      };
    }
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
        },
      },
    });

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
}
