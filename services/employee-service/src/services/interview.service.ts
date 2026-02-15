/**
 * Interview Service
 * Handles all interview-related business logic
 */

import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';
import { logInterviewActivity, logCandidateStatusChange } from './activity.service';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateInterviewDto {
  candidateId: string;
  jobId: string;
  type: 'PHONE_SCREEN' | 'TECHNICAL' | 'HR' | 'MANAGER' | 'FINAL' | 'ASSIGNMENT' | 'ASSESSMENT';
  roundNumber: number;
  scheduledAt: string;
  duration: number;
  mode: 'VIDEO' | 'PHONE' | 'IN_PERSON';
  meetingLink?: string;
  location?: string;
  instructions?: string;
  panelistIds: string[];
  sendCalendarInvite?: boolean;
  sendEmailNotification?: boolean;
  // Assessment-specific fields
  assessmentTestId?: string;
  assessmentValidUntil?: string;
}

export interface UpdateInterviewDto {
  scheduledAt?: string;
  duration?: number;
  mode?: 'VIDEO' | 'PHONE' | 'IN_PERSON';
  meetingLink?: string;
  location?: string;
  instructions?: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
  panelistIds?: string[];
}

export interface SubmitFeedbackDto {
  technicalRating?: number;
  problemSolvingRating?: number;
  communicationRating?: number;
  culturalFitRating?: number;
  leadershipRating?: number;
  overallRating: number;
  strengths?: string;
  weaknesses?: string;
  comments?: string;
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'STRONG_NO_HIRE';
  isDraft?: boolean;
}

export interface InterviewFilters {
  status?: string;
  type?: string;
  jobId?: string;
  candidateId?: string;
  interviewerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class InterviewService {
  /**
   * Get all interviews with optional filters
   */
  static async getAllInterviews(tenantSlug: string, filters?: InterviewFilters) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {};

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.type && filters.type !== 'all') {
      where.type = filters.type;
    }

    if (filters?.jobId) {
      where.jobId = filters.jobId;
    }

    if (filters?.candidateId) {
      where.candidateId = filters.candidateId;
    }

    if (filters?.interviewerId) {
      where.panelists = {
        some: { employeeId: filters.interviewerId },
      };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledAt = {};
      if (filters.dateFrom) {
        // Start of day for dateFrom
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.scheduledAt.gte = fromDate;
      }
      if (filters.dateTo) {
        // End of day for dateTo (23:59:59.999)
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.scheduledAt.lte = toDate;
      }
    }

    if (filters?.search) {
      where.OR = [
        { candidate: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { candidate: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const interviews = await db.interview.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            resumeUrl: true,
            currentCompany: true,
            currentRole: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
        panelists: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                designation: {
                  select: { name: true },
                },
                department: {
                  select: { name: true },
                },
              },
            },
          },
        },
        feedback: {
          include: {
            interviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Transform to flatten nested objects
    return interviews.map((interview: any) => ({
      ...interview,
      job: interview.candidate?.job,
      panelists: interview.panelists?.map((p: any) => ({
        ...p,
        employee: p.employee ? {
          ...p.employee,
          designation: p.employee.designation?.name,
          department: p.employee.department?.name,
        } : null,
      })),
    }));
  }

  /**
   * Get a single interview by ID
   */
  static async getInterviewById(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            resumeUrl: true,
            currentCompany: true,
            currentRole: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
        panelists: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                designation: {
                  select: { name: true },
                },
                department: {
                  select: { name: true },
                },
              },
            },
          },
        },
        feedback: {
          include: {
            interviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new Error('Interview not found');
    }

    // Get total rounds for this candidate's job
    const totalInterviews = await db.interview.count({
      where: { candidateId: interview.candidateId },
    });

    return {
      ...interview,
      job: (interview as any).candidate?.job,
      totalRounds: Math.max(interview.totalRounds, totalInterviews),
      panelists: (interview as any).panelists?.map((p: any) => ({
        ...p,
        employee: p.employee ? {
          ...p.employee,
          designation: p.employee.designation?.name,
          department: p.employee.department?.name,
        } : null,
      })),
    };
  }

  /**
   * Create a new interview
   */
  static async createInterview(tenantSlug: string, data: CreateInterviewDto, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Verify candidate exists
    const candidate = await db.jobCandidate.findUnique({
      where: { id: data.candidateId },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // For ASSESSMENT type, verify test exists and is published
    if (data.type === 'ASSESSMENT') {
      if (!data.assessmentTestId) {
        throw new Error('Assessment test is required for ASSESSMENT type interview');
      }
      
      const test = await db.assessmentTest.findUnique({
        where: { id: data.assessmentTestId },
      });
      
      if (!test) {
        throw new Error('Assessment test not found');
      }
      
      if (test.status !== 'PUBLISHED') {
        throw new Error('Assessment test must be published');
      }
    }

    // Get current round number for this candidate
    const existingInterviews = await db.interview.count({
      where: { candidateId: data.candidateId },
    });

    const interview = await db.interview.create({
      data: {
        candidateId: data.candidateId,
        jobId: data.jobId,
        type: data.type,
        roundNumber: data.roundNumber || existingInterviews + 1,
        totalRounds: 4, // Default, can be configured
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration || 60,
        mode: data.mode,
        meetingLink: data.meetingLink,
        location: data.location,
        instructions: data.instructions,
        status: 'SCHEDULED',
        createdBy: userId,
        assessmentTestId: data.type === 'ASSESSMENT' ? data.assessmentTestId : null,
        panelists: {
          create: data.panelistIds.map((employeeId, index) => ({
            employeeId,
            isLead: index === 0, // First panelist is lead
          })),
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
        panelists: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        assessmentTest: data.type === 'ASSESSMENT' ? {
          select: {
            id: true,
            name: true,
            duration: true,
            passingScore: true,
          },
        } : undefined,
      },
    });

    // For ASSESSMENT type, create an assessment invitation
    if (data.type === 'ASSESSMENT' && data.assessmentTestId) {
      // Generate unique assessment code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let assessmentCode = '';
      for (let i = 0; i < 8; i++) {
        assessmentCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Create the invitation
      const validUntil = data.assessmentValidUntil 
        ? new Date(data.assessmentValidUntil)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

      const invitation = await db.assessmentInvitation.create({
        data: {
          testId: data.assessmentTestId,
          candidateId: data.candidateId,
          interviewId: interview.id,
          candidateEmail: candidate.email,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          assessmentCode,
          validFrom: new Date(data.scheduledAt),
          validUntil,
          status: 'PENDING',
          createdBy: userId,
        },
      });

      // Update interview with assessment link
      const assessmentLink = `/assessment/start?code=${assessmentCode}`;
      await db.interview.update({
        where: { id: interview.id },
        data: { meetingLink: assessmentLink },
      });

      logger.info({ interviewId: interview.id, invitationId: invitation.id }, 'Assessment interview created with invitation');
    }

    // Update candidate status based on interview type
    const statusMap: Record<string, string> = {
      PHONE_SCREEN: 'SCREENING',
      TECHNICAL: 'SHORTLISTED',
      ASSIGNMENT: 'SHORTLISTED',
      ASSESSMENT: 'SHORTLISTED',
      HR: 'INTERVIEWED',
      MANAGER: 'INTERVIEWED',
      FINAL: 'INTERVIEWED',
    };

    const newStatus = statusMap[data.type];
    if (newStatus) {
      await db.jobCandidate.update({
        where: { id: data.candidateId },
        data: { status: newStatus as any },
      });
    }

    logger.info({ interviewId: interview.id }, 'Interview created');

    // Log activity
    const candidateName = `${interview.candidate?.firstName} ${interview.candidate?.lastName}`;
    const jobTitle = interview.candidate?.job?.title || 'Unknown Position';
    await logInterviewActivity(
      db,
      interview.id,
      candidateName,
      'scheduled',
      jobTitle,
      userId
    );

    return {
      ...interview,
      job: (interview as any).candidate?.job,
    };
  }

  /**
   * Update an interview
   */
  static async updateInterview(tenantSlug: string, id: string, data: UpdateInterviewDto, userId?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const existing = await db.interview.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Interview not found');
    }

    const updateData: any = {};

    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.duration) updateData.duration = data.duration;
    if (data.mode) updateData.mode = data.mode;
    if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.status) updateData.status = data.status;

    const interview = await db.interview.update({
      where: { id },
      data: updateData,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
        panelists: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Update panelists if provided
    if (data.panelistIds) {
      // Remove existing panelists
      await db.interviewPanelist.deleteMany({
        where: { interviewId: id },
      });

      // Add new panelists
      await db.interviewPanelist.createMany({
        data: data.panelistIds.map((employeeId, index) => ({
          interviewId: id,
          employeeId,
          isLead: index === 0,
        })),
      });
    }

    logger.info({ interviewId: id }, 'Interview updated');

    return {
      ...interview,
      job: (interview as any).candidate?.job,
    };
  }

  /**
   * Cancel an interview
   */
  static async cancelInterview(tenantSlug: string, id: string, reason?: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const interview = await db.interview.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    logger.info({ interviewId: id }, 'Interview cancelled');
    return interview;
  }

  /**
   * Mark interview as complete
   */
  static async completeInterview(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const interview = await db.interview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            job: { select: { title: true } },
          },
        },
      },
    });

    logger.info({ interviewId: id }, 'Interview completed');

    // Log activity
    const candidate = (interview as any).candidate;
    if (candidate) {
      await logInterviewActivity(
        db,
        id,
        `${candidate.firstName} ${candidate.lastName}`,
        'completed',
        candidate.job?.title || 'Unknown Position'
      );
    }

    return interview;
  }

  /**
   * Reschedule an interview
   */
  static async rescheduleInterview(tenantSlug: string, id: string, newDate: string, duration?: number) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const updateData: any = {
      scheduledAt: new Date(newDate),
      status: 'RESCHEDULED',
    };

    if (duration) {
      updateData.duration = duration;
    }

    const interview = await db.interview.update({
      where: { id },
      data: updateData,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        panelists: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info({ interviewId: id, newDate }, 'Interview rescheduled');
    return interview;
  }

  /**
   * Submit or update feedback for an interview
   */
  static async submitFeedback(tenantSlug: string, interviewId: string, interviewerId: string, data: SubmitFeedbackDto) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    // Check if feedback already exists
    const existing = await db.interviewFeedback.findUnique({
      where: {
        interviewId_interviewerId: {
          interviewId,
          interviewerId,
        },
      },
    });

    const feedbackData = {
      technicalRating: data.technicalRating,
      problemSolvingRating: data.problemSolvingRating,
      communicationRating: data.communicationRating,
      culturalFitRating: data.culturalFitRating,
      leadershipRating: data.leadershipRating,
      overallRating: data.overallRating,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      comments: data.comments,
      recommendation: data.recommendation,
      isDraft: data.isDraft || false,
      submittedAt: data.isDraft ? null : new Date(),
    };

    let feedback;

    if (existing) {
      // Update existing feedback
      feedback = await db.interviewFeedback.update({
        where: { id: existing.id },
        data: feedbackData,
        include: {
          interviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    } else {
      // Create new feedback
      feedback = await db.interviewFeedback.create({
        data: {
          interviewId,
          interviewerId,
          ...feedbackData,
        },
        include: {
          interviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    }

    // Update panelist feedbackSubmitted status
    if (!data.isDraft) {
      await db.interviewPanelist.updateMany({
        where: {
          interviewId,
          employeeId: interviewerId,
        },
        data: { feedbackSubmitted: true },
      });
    }

    logger.info({ interviewId, interviewerId }, 'Feedback submitted');
    return feedback;
  }

  /**
   * Get interview statistics
   */
  static async getStats(tenantSlug: string, filters?: { dateFrom?: string; dateTo?: string }) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {};

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledAt = {};
      if (filters.dateFrom) {
        // Start of day for dateFrom
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.scheduledAt.gte = fromDate;
      }
      if (filters.dateTo) {
        // End of day for dateTo (23:59:59.999)
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.scheduledAt.lte = toDate;
      }
    }

    const [
      totalScheduled,
      totalCompleted,
      totalCancelled,
      totalNoShow,
      feedbackStats,
    ] = await Promise.all([
      db.interview.count({ where: { ...where, status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] } } }),
      db.interview.count({ where: { ...where, status: 'COMPLETED' } }),
      db.interview.count({ where: { ...where, status: 'CANCELLED' } }),
      db.interview.count({ where: { ...where, status: 'NO_SHOW' } }),
      db.interviewFeedback.aggregate({
        where: { isDraft: false },
        _avg: { overallRating: true },
      }),
    ]);

    // Get today's and this week's upcoming interviews
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Include RESCHEDULED status in upcoming counts (rescheduled interviews are still upcoming)
    const upcomingStatuses = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'];
    
    const [upcomingToday, upcomingWeek, upcomingAll, upcomingExcludingToday] = await Promise.all([
      db.interview.count({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          status: { in: upcomingStatuses },
        },
      }),
      db.interview.count({
        where: {
          scheduledAt: { gte: today, lt: nextWeek },
          status: { in: upcomingStatuses },
        },
      }),
      db.interview.count({
        where: {
          scheduledAt: { gte: today },
          status: { in: upcomingStatuses },
        },
      }),
      db.interview.count({
        where: {
          scheduledAt: { gte: tomorrow },
          status: { in: upcomingStatuses },
        },
      }),
    ]);

    // Calculate pass rate from feedback
    const feedbackCounts = await db.interviewFeedback.groupBy({
      by: ['recommendation'],
      where: { isDraft: false },
      _count: true,
    });

    const passRecommendations = ['STRONG_HIRE', 'HIRE', 'MAYBE'];
    const totalFeedback = feedbackCounts.reduce((sum, f) => sum + f._count, 0);
    const passFeedback = feedbackCounts
      .filter((f) => passRecommendations.includes(f.recommendation))
      .reduce((sum, f) => sum + f._count, 0);
    const passRate = totalFeedback > 0 ? Math.round((passFeedback / totalFeedback) * 100) : 0;

    return {
      totalScheduled,
      totalCompleted,
      totalCancelled,
      totalNoShow,
      passRate,
      avgFeedbackTime: 3.5, // TODO: Calculate from actual data
      upcomingToday,
      upcomingWeek,
      upcomingAll,
      upcomingExcludingToday,
    };
  }

  /**
   * Get today's interviews (includes SCHEDULED, CONFIRMED, and RESCHEDULED)
   */
  static async getTodayInterviews(tenantSlug: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const interviews = await db.interview.findMany({
      where: {
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
        panelists: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                designation: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return interviews.map((interview: any) => ({
      ...interview,
      job: interview.candidate?.job,
      panelists: interview.panelists?.map((p: any) => ({
        ...p,
        employee: p.employee ? {
          ...p.employee,
          designation: p.employee.designation?.name,
          department: p.employee.department?.name,
        } : null,
      })),
    }));
  }

  /**
   * Get interviews for a specific candidate
   */
  static async getCandidateInterviews(tenantSlug: string, candidateId: string) {
    return this.getAllInterviews(tenantSlug, { candidateId });
  }

  /**
   * Delete an interview
   */
  static async deleteInterview(tenantSlug: string, id: string) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    await db.interview.delete({
      where: { id },
    });

    logger.info({ interviewId: id }, 'Interview deleted');
  }

  /**
   * Get comprehensive interview analytics
   */
  static async getAnalytics(tenantSlug: string, filters?: { dateFrom?: string; dateTo?: string }) {
    const db = await getTenantPrismaBySlug(tenantSlug);

    const where: any = {};

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledAt = {};
      if (filters.dateFrom) {
        where.scheduledAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.scheduledAt.lte = new Date(filters.dateTo);
      }
    }

    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingStatuses = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'];

    // Overview Stats
    const [
      totalScheduled,
      totalCompleted,
      totalCancelled,
      totalNoShow,
      upcomingToday,
      upcomingWeek,
    ] = await Promise.all([
      db.interview.count({ where: { ...where, status: { in: upcomingStatuses } } }),
      db.interview.count({ where: { ...where, status: 'COMPLETED' } }),
      db.interview.count({ where: { ...where, status: 'CANCELLED' } }),
      db.interview.count({ where: { ...where, status: 'NO_SHOW' } }),
      db.interview.count({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          status: { in: upcomingStatuses },
        },
      }),
      db.interview.count({
        where: {
          scheduledAt: { gte: today, lt: nextWeek },
          status: { in: upcomingStatuses },
        },
      }),
    ]);

    // Interviews by Type (Stage)
    const interviewsByType = await db.interview.groupBy({
      by: ['type'],
      where,
      _count: true,
    });

    const totalInterviews = interviewsByType.reduce((sum, t) => sum + t._count, 0);
    const typeLabels: Record<string, string> = {
      PHONE_SCREEN: 'Phone Screen',
      TECHNICAL: 'Technical',
      HR: 'HR Round',
      MANAGER: 'Manager Round',
      FINAL: 'Final Round',
      ASSIGNMENT: 'Assignment',
    };

    const interviewsByStage = interviewsByType.map(t => ({
      type: typeLabels[t.type] || t.type,
      count: t._count,
      percentage: totalInterviews > 0 ? Math.round((t._count / totalInterviews) * 100) : 0,
    }));

    // Pass Rate by Round - Get feedback grouped by interview type
    const passRateByRound: { round: string; passRate: number; total: number; passed: number }[] = [];
    
    for (const type of Object.keys(typeLabels)) {
      const feedbackForType = await db.interviewFeedback.findMany({
        where: {
          isDraft: false,
          interview: { type: type as any, ...where },
        },
        select: { recommendation: true },
      });

      const total = feedbackForType.length;
      const passed = feedbackForType.filter(f => 
        ['STRONG_HIRE', 'HIRE', 'MAYBE'].includes(f.recommendation)
      ).length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      if (total > 0) {
        passRateByRound.push({
          round: typeLabels[type],
          passRate,
          total,
          passed,
        });
      }
    }

    // Top Interviewers
    const panelistStats = await db.interviewPanelist.groupBy({
      by: ['employeeId'],
      _count: true,
      orderBy: { _count: { employeeId: 'desc' } },
      take: 5,
    });

    const topInterviewers = await Promise.all(
      panelistStats.map(async (p) => {
        const employee = await db.employee.findUnique({
          where: { id: p.employeeId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            designation: { select: { name: true } },
          },
        });

        // Get average rating for this interviewer
        const feedbackStats = await db.interviewFeedback.aggregate({
          where: { interviewerId: p.employeeId, isDraft: false },
          _avg: { overallRating: true },
        });

        return {
          id: p.employeeId,
          name: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          avatar: employee?.avatar,
          designation: employee?.designation?.name || 'Employee',
          interviews: p._count,
          avgRating: feedbackStats._avg.overallRating ? Number(feedbackStats._avg.overallRating.toFixed(1)) : 0,
          feedbackTime: 2, // TODO: Calculate actual feedback time
        };
      })
    );

    // Hires by Department
    const hiredCandidates = await db.jobCandidate.findMany({
      where: { status: 'HIRED' },
      include: {
        job: { select: { department: true } },
      },
    });

    const departmentHires: Record<string, { hires: number; interviews: number }> = {};
    
    for (const candidate of hiredCandidates) {
      const dept = candidate.job?.department || 'Other';
      if (!departmentHires[dept]) {
        departmentHires[dept] = { hires: 0, interviews: 0 };
      }
      departmentHires[dept].hires++;
    }

    // Get total interviews by department (through candidate -> job)
    const interviewsByDept = await db.interview.findMany({
      where,
      include: {
        candidate: {
          include: {
            job: { select: { department: true } },
          },
        },
      },
    });

    for (const interview of interviewsByDept) {
      const dept = (interview as any).candidate?.job?.department || 'Other';
      if (!departmentHires[dept]) {
        departmentHires[dept] = { hires: 0, interviews: 0 };
      }
      departmentHires[dept].interviews++;
    }

    const hiresByDepartment = Object.entries(departmentHires)
      .filter(([_, data]) => data.interviews > 0)
      .map(([department, data]) => ({
        department,
        hires: data.hires,
        interviews: data.interviews,
        rate: data.interviews > 0 ? Math.round((data.hires / data.interviews) * 100) : 0,
      }))
      .sort((a, b) => b.hires - a.hires)
      .slice(0, 5);

    // Recent Activity - Get latest interview events
    const recentInterviews = await db.interview.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        candidate: {
          select: { firstName: true, lastName: true },
        },
        feedback: {
          where: { isDraft: false },
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { recommendation: true },
        },
      },
    });

    const recommendationLabels: Record<string, string> = {
      STRONG_HIRE: 'Strong Hire',
      HIRE: 'Hire',
      MAYBE: 'Maybe',
      NO_HIRE: 'No Hire',
      STRONG_NO_HIRE: 'Strong No Hire',
    };

    const recentActivity = recentInterviews.slice(0, 5).map(interview => {
      const candidateName = interview.candidate 
        ? `${interview.candidate.firstName} ${interview.candidate.lastName}`
        : 'Unknown Candidate';
      
      let action = '';
      let result: string | null = null;
      
      switch (interview.status) {
        case 'COMPLETED':
          action = `Completed ${typeLabels[interview.type] || interview.type}`;
          if (interview.feedback?.[0]) {
            result = recommendationLabels[interview.feedback[0].recommendation] || interview.feedback[0].recommendation;
          }
          break;
        case 'SCHEDULED':
        case 'RESCHEDULED':
          action = `Scheduled ${typeLabels[interview.type] || interview.type}`;
          break;
        case 'CANCELLED':
          action = 'Interview Cancelled';
          result = 'Cancelled';
          break;
        case 'NO_SHOW':
          action = 'No Show';
          result = 'No Show';
          break;
        default:
          action = `${interview.status} - ${typeLabels[interview.type] || interview.type}`;
      }

      // Calculate time ago
      const updatedAt = new Date(interview.updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - updatedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeAgo = '';
      if (diffMins < 60) {
        timeAgo = `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }

      return {
        candidate: candidateName,
        action,
        time: timeAgo,
        result,
      };
    });

    // Calculate pass rate
    const feedbackCounts = await db.interviewFeedback.groupBy({
      by: ['recommendation'],
      where: { isDraft: false },
      _count: true,
    });

    const passRecommendations = ['STRONG_HIRE', 'HIRE', 'MAYBE'];
    const totalFeedback = feedbackCounts.reduce((sum, f) => sum + f._count, 0);
    const passFeedback = feedbackCounts
      .filter((f) => passRecommendations.includes(f.recommendation))
      .reduce((sum, f) => sum + f._count, 0);
    const passRate = totalFeedback > 0 ? Math.round((passFeedback / totalFeedback) * 100) : 0;

    // Days to hire calculation
    const hiredWithDates = await db.jobCandidate.findMany({
      where: { 
        status: 'HIRED',
        AND: [
          { hiredAt: { not: undefined } },
          { appliedAt: { not: undefined } },
        ],
      },
      select: { appliedAt: true, hiredAt: true },
    });

    let avgDaysToHire = 0;
    if (hiredWithDates.length > 0) {
      const totalDays = hiredWithDates.reduce((sum, c) => {
        if (c.appliedAt && c.hiredAt) {
          const days = Math.floor(
            (new Date(c.hiredAt).getTime() - new Date(c.appliedAt).getTime()) / 86400000
          );
          return sum + days;
        }
        return sum;
      }, 0);
      avgDaysToHire = Math.round(totalDays / hiredWithDates.length);
    }

    return {
      overview: {
        totalScheduled,
        totalCompleted,
        totalCancelled,
        totalNoShow,
        avgTimeToHire: hiredWithDates.length > 0 ? avgDaysToHire : null, // null if no hired data
        passRate,
        upcomingToday,
        upcomingWeek,
      },
      trends: {
        scheduledChange: 0, // TODO: Calculate vs previous period
        completedChange: 0,
        cancelledChange: 0,
        passRateChange: 0,
      },
      interviewsByType: interviewsByStage,
      passRateByRound: passRateByRound.length > 0 ? passRateByRound : [
        { round: 'No Data', passRate: 0, total: 0, passed: 0 },
      ],
      topInterviewers: topInterviewers.length > 0 ? topInterviewers : [],
      hiresByDepartment: hiresByDepartment.length > 0 ? hiresByDepartment : [],
      recentActivity,
    };
  }
}
