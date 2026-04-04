import {
  Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CreateConversationDto, SendMessageDto, AssignConversationDto, InternalNoteDto } from './dto/conversation.dto';

@ApiTags('Conversations')
@ApiBearerAuth('access-token')
@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List conversations with filters' })
  @ApiResponse({ status: 200, description: 'Conversations list' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.conversationsService.list(tenantId, query);
  }

  @Post()
  @RequirePermissions('conversations:create')
  @ApiOperation({ summary: 'Start a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateConversationDto) {
    return this.conversationsService.createConversation(tenantId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Update conversation (assign, status change)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.conversationsService.updateConversation(tenantId, id, body);
  }

  @Get(':id/messages')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get messages with pagination' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async getMessages(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.conversationsService.getMessages(tenantId, id, query);
  }

  @Post(':id/messages')
  @RequirePermissions('conversations:create')
  @ApiOperation({ summary: 'Send a message (email or SMS based on channel)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(tenantId, id, user.sub, dto);
  }

  @Post(':id/assign')
  @RequirePermissions('conversations:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign conversation to a user' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async assign(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(tenantId, id, dto.assigneeId);
  }

  @Post(':id/close')
  @RequirePermissions('conversations:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async close(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.closeConversation(tenantId, id);
  }

  @Post(':id/reopen')
  @RequirePermissions('conversations:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async reopen(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.reopenConversation(tenantId, id);
  }

  @Post(':id/notes')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Add an internal note' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async addNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: InternalNoteDto,
  ) {
    return this.conversationsService.addInternalNote(tenantId, id, user.sub, dto.content);
  }
}
