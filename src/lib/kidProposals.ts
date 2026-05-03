export const KID_PROPOSALS_KEY = 'famactify-kid-proposals';

export type KidProposalStatus = 'pending' | 'parent_suggestion' | 'approved' | 'declined';
export type FamilyModeForProposal = 'parent' | 'kid' | 'little-explorer';

export interface KidProposal {
  id: string;
  activityId: string;
  activityName: string;
  activityImage: string | null;
  lat?: number | null;
  lon?: number | null;
  address?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  ageBuckets?: string[] | null;
  urlmoreinfo?: string | null;
  urlmoreinfo_status?: string | null;
  message?: string;
  createdAt?: string;
  status: KidProposalStatus;
  source?: 'planner' | 'little' | 'parent';
  planId?: string | null;
}

export function readKidProposals(): KidProposal[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KID_PROPOSALS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeKidProposals(proposals: KidProposal[]) {
  localStorage.setItem(KID_PROPOSALS_KEY, JSON.stringify(proposals));
  window.dispatchEvent(new Event('storage'));
}

export function countUniqueActionableKidProposals(
  mode: FamilyModeForProposal,
  proposals: KidProposal[] = readKidProposals(),
) {
  const actionableStatus = mode === 'parent' ? 'pending' : 'parent_suggestion';
  return new Set(
    proposals
      .filter(proposal => proposal.status === actionableStatus)
      .map(proposal => proposal.activityId),
  ).size;
}

export function uniqueActionableKidProposals(
  proposals: KidProposal[],
  status: KidProposalStatus,
) {
  const seen = new Set<string>();
  return proposals.filter(proposal => {
    if (proposal.status !== status) return false;
    if (seen.has(proposal.activityId)) return false;
    seen.add(proposal.activityId);
    return true;
  });
}
