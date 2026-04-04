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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants the current user belongs to' })
  @ApiResponse({ status: 200, description: 'List of user tenants' })
  async listUserTenants(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.listUserTenants(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant or sub-account' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @RequirePermissions('settings:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 204, description: 'Tenant deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.tenantsService.delete(id, user.sub);
  }

  @Get(':id/sub-accounts')
  @RequirePermissions('members:read')
  @ApiOperation({ summary: 'List sub-accounts for an agency tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Sub-accounts list' })
  async listSubAccounts(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.tenantsService.listSubAccounts(id, user.sub, query);
  }

  @Post(':id/members')
  @RequirePermissions('members:create')
  @ApiOperation({ summary: 'Invite a user to the tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteMember(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.tenantsService.inviteMember(id, user.sub, dto);
  }

  @Get(':id/members')
  @RequirePermissions('members:read')
  @ApiOperation({ summary: 'List all members of a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Members list' })
  async listMembers(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.listMembers(id, user.sub);
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions('members:update')
  @ApiOperation({ summary: 'Update a member role or status' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.tenantsService.updateMember(id, memberId, user.sub, dto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions('members:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.tenantsService.removeMember(id, memberId, user.sub);
  }

  @Post('switch/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch to a different tenant' })
  @ApiParam({ name: 'tenantId', description: 'Target tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant switched' })
  @ApiResponse({ status: 403, description: 'No access to target tenant' })
  async switchTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.switchTenant(user.sub, tenantId);
  }
}
