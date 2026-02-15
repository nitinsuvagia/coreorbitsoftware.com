/**
 * Comment Service - Task comments with mentions
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { differenceInMinutes } from 'date-fns';
import { getEventBus, SQS_QUEUES } from '@oms/event-bus';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCommentInput {
  taskId: string;
  content: string;
  parentCommentId?: string;
  mentions?: string[]; // employee IDs
  attachments?: string[]; // attachment IDs
}

export interface UpdateCommentInput {
  content: string;
}

export interface CommentFilters {
  taskId: string;
  includeReplies?: boolean;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMentions(content: string): string[] {
  // Extract @mentions from content (e.g., @employee-uuid)
  const mentionRegex = /@([a-f0-9-]{36})/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Create a comment
 */
export async function createComment(
  prisma: PrismaClient,
  input: CreateCommentInput,
  userId: string,
  employeeId: string,
  tenantContext: { tenantId: string; tenantSlug: string }
): Promise<any> {
  const eventBus = getEventBus('task-service');
  const id = uuidv4();
  
  // Validate content length
  if (input.content.length > config.comment.maxCommentLength) {
    throw new Error(`Comment content exceeds maximum length of ${config.comment.maxCommentLength} characters`);
  }
  
  // Validate parent comment if replying
  if (input.parentCommentId) {
    const parentComment = await prisma.taskComment.findUnique({
      where: { id: input.parentCommentId },
    });
    
    if (!parentComment) {
      throw new Error('Parent comment not found');
    }
    
    if (parentComment.taskId !== input.taskId) {
      throw new Error('Parent comment belongs to a different task');
    }
  }
  
  // Extract mentions from content
  const contentMentions = extractMentions(input.content);
  const allMentions = [...new Set([...(input.mentions || []), ...contentMentions])];
  
  // Create the comment
  const comment = await prisma.taskComment.create({
    data: {
      id,
      taskId: input.taskId,
      userId,
      employeeId,
      content: input.content,
      parentCommentId: input.parentCommentId,
      mentions: allMentions,
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      employee: {
        select: {
          id: true,
          designation: { select: { name: true } },
        },
      },
      parentComment: {
        select: {
          id: true,
          content: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      task: {
        select: { taskNumber: true, title: true, projectId: true },
      },
    },
  });
  
  // Link attachments
  if (input.attachments?.length) {
    await prisma.taskAttachment.updateMany({
      where: { id: { in: input.attachments } },
      data: { commentId: id },
    });
  }
  
  // Log activity
  await prisma.taskActivity.create({
    data: {
      id: uuidv4(),
      taskId: input.taskId,
      userId,
      action: input.parentCommentId ? 'replied' : 'commented',
      details: {
        commentId: id,
        preview: input.content.substring(0, 100),
      },
    },
  });
  
  // Emit event for mentions/notifications
  if (allMentions.length > 0) {
    await eventBus.sendToQueue(
      SQS_QUEUES.NOTIFICATION_SEND,
      'task.mentioned',
      {
        taskId: input.taskId,
        taskNumber: comment.task.taskNumber,
        taskTitle: comment.task.title,
        commentId: id,
        commentPreview: input.content.substring(0, 200),
        mentionedEmployeeIds: allMentions,
        mentionedByUserId: userId,
      },
      tenantContext
    );
  }
  
  // Emit comment event
  await eventBus.sendToQueue(
    SQS_QUEUES.NOTIFICATION_SEND,
    'task.commented',
    {
      taskId: input.taskId,
      taskNumber: comment.task.taskNumber,
      projectId: comment.task.projectId,
      commentId: id,
      commentedByUserId: userId,
      isReply: !!input.parentCommentId,
    },
    tenantContext
  );
  
  logger.info({ commentId: id, taskId: input.taskId }, 'Comment created');
  
  return comment;
}

/**
 * Get comment by ID
 */
export async function getCommentById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  return prisma.taskComment.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      employee: {
        select: {
          id: true,
          designation: { select: { name: true } },
        },
      },
      parentComment: {
        select: {
          id: true,
          content: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      replies: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Update a comment
 */
export async function updateComment(
  prisma: PrismaClient,
  id: string,
  input: UpdateCommentInput,
  userId: string
): Promise<any> {
  const existing = await prisma.taskComment.findUnique({
    where: { id },
  });
  
  if (!existing) {
    throw new Error('Comment not found');
  }
  
  if (existing.userId !== userId) {
    throw new Error('You can only edit your own comments');
  }
  
  // Check edit window
  if (config.comment.editWindowMinutes > 0) {
    const minutesSinceCreation = differenceInMinutes(new Date(), existing.createdAt);
    if (minutesSinceCreation > config.comment.editWindowMinutes) {
      throw new Error(`Comments can only be edited within ${config.comment.editWindowMinutes} minutes of posting`);
    }
  }
  
  // Validate content length
  if (input.content.length > config.comment.maxCommentLength) {
    throw new Error(`Comment content exceeds maximum length of ${config.comment.maxCommentLength} characters`);
  }
  
  // Extract mentions from new content
  const mentions = extractMentions(input.content);
  
  const comment = await prisma.taskComment.update({
    where: { id },
    data: {
      content: input.content,
      mentions,
      isEdited: true,
      editedAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      employee: {
        select: {
          id: true,
          designation: { select: { name: true } },
        },
      },
    },
  });
  
  logger.info({ commentId: id }, 'Comment updated');
  
  return comment;
}

/**
 * Delete a comment
 */
export async function deleteComment(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const existing = await prisma.taskComment.findUnique({
    where: { id },
    include: { replies: { select: { id: true } } },
  });
  
  if (!existing) {
    throw new Error('Comment not found');
  }
  
  if (existing.userId !== userId) {
    throw new Error('You can only delete your own comments');
  }
  
  // If comment has replies, soft delete by clearing content
  if (existing.replies.length > 0) {
    await prisma.taskComment.update({
      where: { id },
      data: {
        content: '[Comment deleted]',
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  } else {
    // Delete comment
    await prisma.taskComment.delete({ where: { id } });
  }
  
  logger.info({ commentId: id }, 'Comment deleted');
}

/**
 * List comments for a task
 */
export async function listComments(
  prisma: PrismaClient,
  filters: CommentFilters
): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const page = filters.page || 1;
  const pageSize = Math.min(filters.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  
  const where: any = { taskId: filters.taskId };
  
  if (!filters.includeReplies) {
    where.parentCommentId = null;
  }
  
  const [comments, total] = await Promise.all([
    prisma.taskComment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        employee: {
          select: {
            id: true,
            designation: { select: { name: true } },
          },
        },
        replies: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
            employee: {
              select: {
                id: true,
                designation: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 5, // Limit replies in list view
        },
        _count: { select: { replies: true } },
      },
    }),
    prisma.taskComment.count({ where }),
  ]);
  
  return {
    data: comments.map(c => ({
      ...c,
      replyCount: c._count.replies,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Add reaction to comment
 */
export async function addReaction(
  prisma: PrismaClient,
  commentId: string,
  emoji: string,
  userId: string
): Promise<any> {
  // Check if reaction already exists
  const existing = await prisma.commentReaction.findFirst({
    where: { commentId, userId, emoji },
  });
  
  if (existing) {
    throw new Error('You have already reacted with this emoji');
  }
  
  const reaction = await prisma.commentReaction.create({
    data: {
      id: uuidv4(),
      commentId,
      userId,
      emoji,
    },
  });
  
  return reaction;
}

/**
 * Remove reaction from comment
 */
export async function removeReaction(
  prisma: PrismaClient,
  commentId: string,
  emoji: string,
  userId: string
): Promise<void> {
  await prisma.commentReaction.deleteMany({
    where: { commentId, userId, emoji },
  });
}

/**
 * Get reactions for a comment
 */
export async function getCommentReactions(
  prisma: PrismaClient,
  commentId: string
): Promise<Record<string, { count: number; users: any[] }>> {
  const reactions = await prisma.commentReaction.findMany({
    where: { commentId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  
  // Group by emoji
  const grouped: Record<string, { count: number; users: any[] }> = {};
  
  for (const reaction of reactions) {
    if (!grouped[reaction.emoji]) {
      grouped[reaction.emoji] = { count: 0, users: [] };
    }
    grouped[reaction.emoji].count++;
    grouped[reaction.emoji].users.push(reaction.user);
  }
  
  return grouped;
}
