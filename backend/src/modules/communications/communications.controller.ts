import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CommunicationType } from '../../entities/communication.entity';

@ApiTags('communications')
@Controller('cases/:caseId/communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all communications for a case' })
  async getCommunications(@Param('caseId') caseId: string) {
    return this.communicationsService.getCommunications(caseId);
  }

  @Get(':commId')
  @ApiOperation({ summary: 'Get a specific communication' })
  async getCommunication(
    @Param('caseId') caseId: string,
    @Param('commId') commId: string,
  ) {
    return this.communicationsService.getCommunication(caseId, commId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a communication draft' })
  async generateCommunication(
    @Param('caseId') caseId: string,
    @Body() body: {
      communicationType: CommunicationType;
      userId: string;
      userName: string;
    },
  ) {
    return this.communicationsService.generateCommunication(caseId, body);
  }

  @Patch(':commId')
  @ApiOperation({ summary: 'Edit a communication draft' })
  async editCommunication(
    @Param('caseId') caseId: string,
    @Param('commId') commId: string,
    @Body() body: {
      sectionId: string;
      newContent: string;
      userId: string;
      userName: string;
    },
  ) {
    return this.communicationsService.editCommunication(caseId, commId, body);
  }

  @Post(':commId/approve')
  @ApiOperation({ summary: 'Approve a communication for dispatch' })
  async approveCommunication(
    @Param('caseId') caseId: string,
    @Param('commId') commId: string,
    @Body() body: { userId: string; userName: string },
  ) {
    return this.communicationsService.approveCommunication(caseId, commId, body.userId, body.userName);
  }

  @Post(':commId/send')
  @ApiOperation({ summary: 'Mark communication as sent' })
  async sendCommunication(
    @Param('caseId') caseId: string,
    @Param('commId') commId: string,
    @Body() body: { method: string; userId: string; userName: string },
  ) {
    return this.communicationsService.sendCommunication(caseId, commId, body);
  }
}
