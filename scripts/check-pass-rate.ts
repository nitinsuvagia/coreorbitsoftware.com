import { getTenantPrisma } from '@oms/database';

async function checkPassRate() {
  const db = await getTenantPrisma('tenant_softqube_001');
  
  // Get all feedback grouped by recommendation
  const feedbackCounts = await db.interviewFeedback.groupBy({
    by: ['recommendation'],
    where: { isDraft: false },
    _count: true,
  });
  
  console.log('=== INTERVIEW FEEDBACK BY RECOMMENDATION ===');
  console.log(JSON.stringify(feedbackCounts, null, 2));
  
  // Calculate pass rate
  const passRecommendations = ['STRONG_HIRE', 'HIRE', 'MAYBE'];
  const totalFeedback = feedbackCounts.reduce((sum: number, f: any) => sum + f._count, 0);
  const passFeedback = feedbackCounts
    .filter((f: any) => passRecommendations.includes(f.recommendation))
    .reduce((sum: number, f: any) => sum + f._count, 0);
  const passRate = totalFeedback > 0 ? Math.round((passFeedback / totalFeedback) * 100) : 0;
  
  console.log('\n=== PASS RATE CALCULATION ===');
  console.log('Total Feedback (non-draft):', totalFeedback);
  console.log('Pass Feedback (STRONG_HIRE, HIRE, MAYBE):', passFeedback);
  console.log('Pass Rate:', passRate + '%');
  
  // Also get completed interviews count
  const completedInterviews = await db.interview.count({
    where: { status: 'COMPLETED' }
  });
  
  console.log('\n=== INTERVIEW COUNTS ===');
  console.log('Completed Interviews:', completedInterviews);
  
  // Get all interviews by status
  const interviewsByStatus = await db.interview.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('\nInterviews by Status:');
  console.log(JSON.stringify(interviewsByStatus, null, 2));
  
  await db.$disconnect();
}

checkPassRate().catch(console.error);
