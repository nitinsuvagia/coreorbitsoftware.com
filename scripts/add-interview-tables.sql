-- Add Interview tables to tenant database
-- This script is safe - it only adds new tables and won't affect existing data

-- Create InterviewPanelist table
CREATE TABLE IF NOT EXISTS "InterviewPanelist" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3),
    "feedbackSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewPanelist_pkey" PRIMARY KEY ("id")
);

-- Create InterviewFeedback table
CREATE TABLE IF NOT EXISTS "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "technicalRating" INTEGER,
    "problemSolvingRating" INTEGER,
    "communicationRating" INTEGER,
    "culturalFitRating" INTEGER,
    "leadershipRating" INTEGER,
    "overallRating" INTEGER NOT NULL,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "comments" TEXT,
    "recommendation" "Recommendation" NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys (if they don't exist)
DO $$ BEGIN
    ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" 
    FOREIGN KEY ("candidateId") REFERENCES "JobCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Interview" ADD CONSTRAINT "Interview_jobId_fkey" 
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InterviewPanelist" ADD CONSTRAINT "InterviewPanelist_interviewId_fkey" 
    FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InterviewPanelist" ADD CONSTRAINT "InterviewPanelist_employeeId_fkey" 
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewId_fkey" 
    FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewerId_fkey" 
    FOREIGN KEY ("interviewerId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create unique constraint for feedback (one feedback per interviewer per interview)
DO $$ BEGIN
    ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewId_interviewerId_key" 
    UNIQUE ("interviewId", "interviewerId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Interview_candidateId_idx" ON "Interview"("candidateId");
CREATE INDEX IF NOT EXISTS "Interview_jobId_idx" ON "Interview"("jobId");
CREATE INDEX IF NOT EXISTS "Interview_status_idx" ON "Interview"("status");
CREATE INDEX IF NOT EXISTS "Interview_scheduledAt_idx" ON "Interview"("scheduledAt");
CREATE INDEX IF NOT EXISTS "InterviewPanelist_interviewId_idx" ON "InterviewPanelist"("interviewId");
CREATE INDEX IF NOT EXISTS "InterviewPanelist_employeeId_idx" ON "InterviewPanelist"("employeeId");
CREATE INDEX IF NOT EXISTS "InterviewFeedback_interviewId_idx" ON "InterviewFeedback"("interviewId");
