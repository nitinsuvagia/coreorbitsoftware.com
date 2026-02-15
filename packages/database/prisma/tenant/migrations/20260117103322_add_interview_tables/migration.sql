-- CreateEnum: InterviewType
DO $$ BEGIN
    CREATE TYPE "InterviewType" AS ENUM ('PHONE_SCREEN', 'TECHNICAL', 'HR', 'MANAGER', 'FINAL', 'ASSIGNMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: InterviewMode
DO $$ BEGIN
    CREATE TYPE "InterviewMode" AS ENUM ('VIDEO', 'PHONE', 'IN_PERSON');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: InterviewStatus
DO $$ BEGIN
    CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: Recommendation
DO $$ BEGIN
    CREATE TYPE "Recommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: interviews
CREATE TABLE IF NOT EXISTS "interviews" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "round_number" INTEGER NOT NULL DEFAULT 1,
    "total_rounds" INTEGER NOT NULL DEFAULT 4,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "mode" "InterviewMode" NOT NULL,
    "meeting_link" TEXT,
    "location" TEXT,
    "instructions" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interview_panelists
CREATE TABLE IF NOT EXISTS "interview_panelists" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3),
    "feedback_submitted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interview_panelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable: interview_feedback
CREATE TABLE IF NOT EXISTS "interview_feedback" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "interviewer_id" TEXT NOT NULL,
    "technical_rating" INTEGER,
    "problem_solving_rating" INTEGER,
    "communication_rating" INTEGER,
    "cultural_fit_rating" INTEGER,
    "leadership_rating" INTEGER,
    "overall_rating" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "comments" TEXT,
    "recommendation" "Recommendation" NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interviews_candidate_id_idx" ON "interviews"("candidate_id");
CREATE INDEX IF NOT EXISTS "interviews_job_id_idx" ON "interviews"("job_id");
CREATE INDEX IF NOT EXISTS "interviews_status_idx" ON "interviews"("status");
CREATE INDEX IF NOT EXISTS "interviews_scheduled_at_idx" ON "interviews"("scheduled_at");

CREATE INDEX IF NOT EXISTS "interview_panelists_interview_id_idx" ON "interview_panelists"("interview_id");
CREATE INDEX IF NOT EXISTS "interview_panelists_employee_id_idx" ON "interview_panelists"("employee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "interview_panelists_interview_id_employee_id_key" ON "interview_panelists"("interview_id", "employee_id");

CREATE INDEX IF NOT EXISTS "interview_feedback_interview_id_idx" ON "interview_feedback"("interview_id");
CREATE INDEX IF NOT EXISTS "interview_feedback_interviewer_id_idx" ON "interview_feedback"("interviewer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "interview_feedback_interview_id_interviewer_id_key" ON "interview_feedback"("interview_id", "interviewer_id");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "job_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interview_panelists" ADD CONSTRAINT "interview_panelists_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_panelists" ADD CONSTRAINT "interview_panelists_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
