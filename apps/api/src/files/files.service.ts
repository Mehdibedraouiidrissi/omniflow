import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/services/storage.service';
import { getAssetType } from './file.config';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async upload(
    tenantId: string,
    file: Express.Multer.File,
    folder?: string,
  ) {
    const uploadResult = await this.storageService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: folder || 'assets',
      tenantId,
    });

    const asset = await this.prisma.asset.create({
      data: {
        tenantId,
        name: file.originalname,
        type: getAssetType(file.mimetype),
        mimeType: file.mimetype,
        size: file.size,
        url: uploadResult.url,
        key: uploadResult.key,
      },
    });

    this.logger.log(`File uploaded: ${asset.id} (${file.originalname}, ${file.size} bytes)`);

    return asset;
  }

  async list(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.type) where.type = query.type;
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOne(tenantId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId },
    });

    if (!asset) {
      throw new NotFoundException('File not found');
    }

    return asset;
  }

  async getSignedUrl(tenantId: string, id: string) {
    const asset = await this.findOne(tenantId, id);
    const signedUrl = await this.storageService.getSignedDownloadUrl(asset.key ?? '');

    return { url: signedUrl, expiresIn: 3600 };
  }

  async delete(tenantId: string, id: string) {
    const asset = await this.findOne(tenantId, id);

    // Delete from S3
    await this.storageService.delete(asset.key ?? '').catch((err) => {
      this.logger.error(`Failed to delete file from storage: ${err.message}`);
    });

    // Delete from database
    await this.prisma.asset.delete({ where: { id } });

    this.logger.log(`File deleted: ${id}`);
  }
}
