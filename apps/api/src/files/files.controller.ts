import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { multerConfig } from './file.config';

@ApiTags('Files')
@ApiBearerAuth('access-token')
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', description: 'Target folder (optional)' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async upload(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.filesService.upload(tenantId, file, folder);
  }

  @Get()
  @ApiOperation({ summary: 'List uploaded files' })
  @ApiQuery({ name: 'type', required: false, enum: ['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'OTHER'] })
  @ApiResponse({ status: 200, description: 'Files list' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.filesService.list(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details' })
  @ApiParam({ name: 'id', description: 'File/Asset ID' })
  @ApiResponse({ status: 200, description: 'File details' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.filesService.findOne(tenantId, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a signed download URL for a file' })
  @ApiParam({ name: 'id', description: 'File/Asset ID' })
  @ApiResponse({ status: 200, description: 'Signed download URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDownloadUrl(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.filesService.getSignedUrl(tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'id', description: 'File/Asset ID' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.filesService.delete(tenantId, id);
  }
}
