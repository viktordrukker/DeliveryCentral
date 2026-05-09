import { TransactionContext } from '@src/shared/domain/transaction-context';

import { StaffingRequestProposalSlate } from '../entities/staffing-request-proposal-slate.entity';

export interface StaffingRequestProposalSlateRepositoryPort {
  /**
   * Save the slate (and its candidates). When `tx` is supplied, joins
   * the caller's `$transaction` so a slate write composes atomically
   * with sibling writes (e.g., the staffing-request status flip in
   * `StaffingProposalSlateService.submit`). When `tx` is omitted, the
   * impl opens its own short transaction internally.
   */
  save(slate: StaffingRequestProposalSlate, tx?: TransactionContext): Promise<void>;
  findById(slateId: string): Promise<StaffingRequestProposalSlate | null>;
  findByStaffingRequestId(staffingRequestId: string): Promise<StaffingRequestProposalSlate | null>;
}
