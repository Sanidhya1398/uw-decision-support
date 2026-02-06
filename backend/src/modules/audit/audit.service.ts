import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditCategory } from '../../entities/audit-log.entity';

interface LogParams {
  caseId: string;
  action: AuditAction;
  category: AuditCategory;
  description: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isSystemAction?: boolean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: LogParams): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      action: params.action,
      category: params.category,
      description: params.description,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      previousState: params.previousState,
      newState: params.newState,
      metadata: params.metadata,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      isSystemAction: params.isSystemAction || false,
      case: { id: params.caseId } as any,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async getCaseAuditLogs(caseId: string) {
    return this.auditLogRepository.find({
      where: { case: { id: caseId } },
      order: { timestamp: 'DESC' },
    });
  }

  async getRecentLogs(limit: number = 50) {
    return this.auditLogRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['case'],
    });
  }

  async getLogsByAction(action: AuditAction, limit: number = 100) {
    return this.auditLogRepository.find({
      where: { action },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getLogsByCategory(category: AuditCategory, limit: number = 100) {
    return this.auditLogRepository.find({
      where: { category },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getLogsByUser(userId: string, limit: number = 100) {
    return this.auditLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
