import { getTenantDbManager } from '../packages/tenant-db-manager/src';

async function revertCandidate() {
  const dbManager = getTenantDbManager();
  const db = await dbManager.getClientBySlug('softqube');
  
  // Get current job hired count
  const job = await db.jobDescription.findUnique({ where: { id: 'job-001' } });
  console.log('Current job hired count:', job?.hired);
  
  // Revert candidate
  const candidate = await db.jobCandidate.update({
    where: { id: 'cand-001' },
    data: {
      status: 'OFFERED',
      stage: 'OFFER',
      hiredAt: null,
      offerResponse: null,
      offerRespondedAt: null,
      offerSignature: null,
      offerTermsAccepted: false,
    },
  });
  console.log('Candidate reverted:', candidate.firstName, candidate.lastName, '- Status:', candidate.status);
  
  // Decrement job hired count
  if (job && job.hired > 0) {
    await db.jobDescription.update({
      where: { id: 'job-001' },
      data: { hired: { decrement: 1 } },
    });
    console.log('Job hired count decremented');
  }
  
  console.log('Done! Candidate ready to accept offer again.');
  process.exit(0);
}

revertCandidate().catch(e => { console.error(e); process.exit(1); });
