import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Case, CaseStatus, ComplexityTier } from '../../entities/case.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';

interface FindAllOptions {
  status?: CaseStatus;
  complexity?: ComplexityTier;
  assignedTo?: string;
  page: number;
  limit: number;
}

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(Case)
    private caseRepository: Repository<Case>,
    private auditService: AuditService,
  ) {}

  async findAll(options: FindAllOptions) {
    const { status, complexity, assignedTo, page, limit } = options;

    const queryBuilder = this.caseRepository
      .createQueryBuilder('case')
      .leftJoinAndSelect('case.applicant', 'applicant')
      .orderBy('case.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('case.status = :status', { status });
    }
    if (complexity) {
      queryBuilder.andWhere('case.complexityTier = :complexity', { complexity });
    }
    if (assignedTo) {
      queryBuilder.andWhere('case.assignedTo = :assignedTo', { assignedTo });
    }

    const total = await queryBuilder.getCount();
    const cases = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneWithDetails(id: string) {
    const caseEntity = await this.caseRepository.findOne({
      where: { id },
      relations: [
        'applicant',
        'medicalDisclosures',
        'documents',
        'testRecommendations',
        'testResults',
        'decisions',
        'communications',
        'riskFactors',
      ],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    return caseEntity;
  }

  async getDashboardSummary(userId?: string) {
    const queryBuilder = this.caseRepository.createQueryBuilder('case');

    if (userId) {
      queryBuilder.where('case.assignedTo = :userId', { userId });
    }

    const [
      totalCases,
      pendingReview,
      inProgress,
      awaitingInfo,
      awaitingDecision,
      completedToday,
      slaAtRisk,
    ] = await Promise.all([
      queryBuilder.getCount(),
      this.caseRepository.count({ where: { status: CaseStatus.PENDING_REVIEW } }),
      this.caseRepository.count({ where: { status: CaseStatus.IN_PROGRESS } }),
      this.caseRepository.count({ where: { status: CaseStatus.AWAITING_INFORMATION } }),
      this.caseRepository.count({ where: { status: CaseStatus.AWAITING_DECISION } }),
      this.caseRepository
        .createQueryBuilder('case')
        .where('case.status = :status', { status: CaseStatus.COMPLETED })
        .andWhere('DATE(case.updatedAt) = DATE(:today)', { today: new Date() })
        .getCount(),
      this.caseRepository
        .createQueryBuilder('case')
        .where('case.slaDeadline < :deadline', {
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .andWhere('case.status NOT IN (:...completedStatuses)', {
          completedStatuses: [CaseStatus.COMPLETED, CaseStatus.DECISION_MADE],
        })
        .getCount(),
    ]);

    // Get complexity distribution
    const complexityDistribution = await this.caseRepository
      .createQueryBuilder('case')
      .select('case.complexityTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('case.complexityTier IS NOT NULL')
      .groupBy('case.complexityTier')
      .getRawMany();

    return {
      summary: {
        totalCases,
        pendingReview,
        inProgress,
        awaitingInfo,
        awaitingDecision,
        completedToday,
        slaAtRisk,
      },
      complexityDistribution: complexityDistribution.reduce(
        (acc, item) => {
          // Normalize tier casing: 'ROUTINE' -> 'Routine', 'moderate' -> 'Moderate'
          const normalizedTier = item.tier
            ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1).toLowerCase()
            : item.tier;
          return { ...acc, [normalizedTier]: parseInt(item.count) };
        },
        {},
      ),
    };
  }

  async assignCase(id: string, userId: string, userName: string) {
    const caseEntity = await this.findOneWithDetails(id);
    const previousAssignee = caseEntity.assignedTo;

    caseEntity.assignedTo = userId;
    caseEntity.assignedToName = userName;
    caseEntity.assignedAt = new Date();

    if (caseEntity.status === CaseStatus.RECEIVED) {
      caseEntity.status = CaseStatus.PENDING_REVIEW;
    }

    await this.caseRepository.save(caseEntity);

    await this.auditService.log({
      caseId: id,
      action: previousAssignee ? AuditAction.CASE_REASSIGNED : AuditAction.CASE_ASSIGNED,
      category: AuditCategory.CASE_MANAGEMENT,
      description: `Case assigned to ${userName}`,
      userId,
      userName,
      previousState: { assignedTo: previousAssignee },
      newState: { assignedTo: userId },
    });

    return caseEntity;
  }

  async updateStatus(id: string, status: CaseStatus, userId: string, reason?: string) {
    const caseEntity = await this.findOneWithDetails(id);
    const previousStatus = caseEntity.status;

    caseEntity.status = status;
    await this.caseRepository.save(caseEntity);

    await this.auditService.log({
      caseId: id,
      action: AuditAction.CASE_STATUS_CHANGED,
      category: AuditCategory.CASE_MANAGEMENT,
      description: `Case status changed from ${previousStatus} to ${status}`,
      userId,
      previousState: { status: previousStatus },
      newState: { status },
      metadata: { reason },
    });

    return caseEntity;
  }

  async addNote(id: string, content: string, userId: string, userName: string) {
    const caseEntity = await this.findOneWithDetails(id);

    await this.auditService.log({
      caseId: id,
      action: AuditAction.NOTE_ADDED,
      category: AuditCategory.CASE_MANAGEMENT,
      description: content,
      userId,
      userName,
      metadata: { noteContent: content },
    });

    return { success: true, message: 'Note added successfully' };
  }

  async getCaseHistory(id: string) {
    return this.auditService.getCaseAuditLogs(id);
  }

  async updateComplexity(
    id: string,
    tier: ComplexityTier,
    confidence: number,
    factors: { factor: string; weight: number; direction: string }[],
  ) {
    const caseEntity = await this.caseRepository.findOne({ where: { id } });
    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    caseEntity.complexityTier = tier;
    caseEntity.complexityConfidence = confidence;
    caseEntity.complexityFactors = factors;

    return this.caseRepository.save(caseEntity);
  }
}
