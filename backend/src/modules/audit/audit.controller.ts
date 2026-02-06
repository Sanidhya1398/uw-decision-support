import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditAction, AuditCategory } from '../../entities/audit-log.entity';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent audit logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentLogs(@Query('limit') limit?: number) {
    return this.auditService.getRecentLogs(limit || 50);
  }

  @Get('action/:action')
  @ApiOperation({ summary: 'Get logs by action type' })
  async getByAction(
    @Param('action') action: AuditAction,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogsByAction(action, limit || 100);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get logs by category' })
  async getByCategory(
    @Param('category') category: AuditCategory,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogsByCategory(category, limit || 100);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get logs by user' })
  async getByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogsByUser(userId, limit || 100);
  }
}
