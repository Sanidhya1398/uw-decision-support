import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { CaseStatus, ComplexityTier } from '../../entities/case.entity';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cases with filters' })
  @ApiQuery({ name: 'status', required: false, enum: CaseStatus })
  @ApiQuery({ name: 'complexity', required: false, enum: ComplexityTier })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('status') status?: CaseStatus,
    @Query('complexity') complexity?: ComplexityTier,
    @Query('assignedTo') assignedTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.casesService.findAll({
      status,
      complexity,
      assignedTo,
      page: page || 1,
      limit: limit || 20,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary' })
  async getDashboard(@Query('userId') userId?: string) {
    return this.casesService.getDashboardSummary(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case by ID with full details' })
  async findOne(@Param('id') id: string) {
    return this.casesService.findOneWithDetails(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign case to underwriter' })
  async assign(
    @Param('id') id: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.casesService.assignCase(id, body.userId, body.userName);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update case status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: CaseStatus; userId: string; reason?: string },
  ) {
    return this.casesService.updateStatus(id, body.status, body.userId, body.reason);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to case' })
  async addNote(
    @Param('id') id: string,
    @Body() body: { content: string; userId: string; userName: string },
  ) {
    return this.casesService.addNote(id, body.content, body.userId, body.userName);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get case audit history' })
  async getHistory(@Param('id') id: string) {
    return this.casesService.getCaseHistory(id);
  }
}
