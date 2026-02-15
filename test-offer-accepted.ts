import { getTenantPrismaClient } from './packages/database';

async function test() {
  const prisma = await getTenantPrismaClient('softqube');
  
  // Get all candidates
  const allCandidates = await prisma.jobCandidate.findMany({
    select: { id: true, status: true, fullName: true }
  });
  console.log('All candidates:', allCandidates);
  
  // Count OFFER_ACCEPTED
  const count = await prisma.jobCandidate.count({ 
    where: { status: 'OFFER_ACCEPTED' } 
  });
  console.log('OFFER_ACCEPTED count:', count);
  
  process.exit(0);
}

test().catch(console.error);
