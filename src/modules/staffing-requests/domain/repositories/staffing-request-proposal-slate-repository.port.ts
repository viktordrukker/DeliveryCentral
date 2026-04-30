import { StaffingRequestProposalSlate } from '../entities/staffing-request-proposal-slate.entity';

export interface StaffingRequestProposalSlateRepositoryPort {
  save(slate: StaffingRequestProposalSlate): Promise<void>;
  findById(slateId: string): Promise<StaffingRequestProposalSlate | null>;
  findByStaffingRequestId(staffingRequestId: string): Promise<StaffingRequestProposalSlate | null>;
}
