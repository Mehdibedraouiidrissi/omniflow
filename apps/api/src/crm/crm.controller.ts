import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  CreateContactDto,
  UpdateContactDto,
  CreateNoteDto,
  CreateTagDto,
  BulkActionDto,
  ImportContactsDto,
  CreateCustomFieldDto,
  MergeContactsDto,
} from './dto/create-contact.dto';

@ApiTags('CRM - Contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class CrmContactsController {
  constructor(private crmService: CrmService) {}

  @Post()
  @RequirePermissions('contacts:create')
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateContactDto) {
    return this.crmService.createContact(tenantId, dto);
  }

  @Get()
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'List contacts with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Contacts list' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.crmService.listContacts(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'Get contact details with relations' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact details' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.crmService.findContact(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('contacts:update')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.crmService.updateContact(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('contacts:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact (soft delete)' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.crmService.deleteContact(tenantId, id);
  }

  @Post('import')
  @RequirePermissions('contacts:create')
  @ApiOperation({ summary: 'Import contacts from CSV' })
  @ApiResponse({ status: 201, description: 'Import results' })
  async importContacts(@CurrentTenant() tenantId: string, @Body() dto: ImportContactsDto) {
    return this.crmService.importContacts(tenantId, dto.csvContent, dto.mapping);
  }

  @Post('export')
  @RequirePermissions('contacts:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export contacts to CSV' })
  async exportContacts(@CurrentTenant() tenantId: string, @Body() filters: Record<string, string>) {
    return this.crmService.exportContacts(tenantId, filters);
  }

  @Post('merge')
  @RequirePermissions('contacts:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge duplicate contacts' })
  async mergeContacts(@CurrentTenant() tenantId: string, @Body() dto: MergeContactsDto) {
    return this.crmService.mergeContacts(tenantId, dto.primaryContactId, dto.secondaryContactIds);
  }

  @Post('bulk')
  @RequirePermissions('contacts:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk actions (tag, assign, delete)' })
  async bulkAction(@CurrentTenant() tenantId: string, @Body() dto: BulkActionDto) {
    const bulkData: Record<string, string> = {};
    if (dto.tagName) bulkData.tagName = dto.tagName;
    if (dto.assigneeId) bulkData.assigneeId = dto.assigneeId;
    return this.crmService.bulkAction(tenantId, dto.action, dto.contactIds, bulkData);
  }

  @Post(':id/tags')
  @RequirePermissions('contacts:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a tag to a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  async addTag(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('tagId') tagId: string,
  ) {
    return this.crmService.addTagToContact(tenantId, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('contacts:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag from a contact' })
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    await this.crmService.removeTagFromContact(id, tagId);
  }

  @Post(':id/notes')
  @RequirePermissions('contacts:update')
  @ApiOperation({ summary: 'Add a note to a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  async addNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.crmService.addNote(tenantId, id, user.sub, dto.content);
  }

  @Get(':id/activities')
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'Get contact activity timeline' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  async getActivities(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.crmService.getActivities(tenantId, id, query);
  }
}

@ApiTags('CRM - Tags')
@ApiBearerAuth('access-token')
@Controller('tags')
export class CrmTagsController {
  constructor(private crmService: CrmService) {}

  @Get()
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'List all tags' })
  async list(@CurrentTenant() tenantId: string) {
    return this.crmService.listTags(tenantId);
  }

  @Post()
  @RequirePermissions('contacts:create')
  @ApiOperation({ summary: 'Create a tag' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateTagDto) {
    return this.crmService.createTag(tenantId, dto.name, dto.color);
  }

  @Patch(':id')
  @RequirePermissions('contacts:update')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CreateTagDto) {
    return this.crmService.updateTag(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('contacts:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.crmService.deleteTag(tenantId, id);
  }
}

@ApiTags('CRM - Custom Fields')
@ApiBearerAuth('access-token')
@Controller('custom-fields')
export class CrmCustomFieldsController {
  constructor(private crmService: CrmService) {}

  @Get()
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'List custom fields' })
  async list(@CurrentTenant() tenantId: string) {
    return this.crmService.listCustomFields(tenantId);
  }

  @Post()
  @RequirePermissions('contacts:create')
  @ApiOperation({ summary: 'Create a custom field' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomFieldDto) {
    return this.crmService.createCustomField(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('contacts:update')
  @ApiOperation({ summary: 'Update a custom field' })
  @ApiParam({ name: 'id', description: 'Custom Field ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.crmService.updateCustomField(tenantId, id, body);
  }
}
