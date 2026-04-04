import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
// @aws-sdk/s3-request-presigner must be installed for signed URL support
let getSignedUrl: any;
try {
  getSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl;
} catch {
  // Presigner not available - signed URLs will not work
}
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  contentType: string;
  size: number;
}

export interface UploadOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
  tenantId?: string;
  isPublic?: boolean;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'omniflow-uploads');
    this.cdnUrl = this.configService.get<string>('CDN_URL', '');

    const s3Config: Record<string, any> = {
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', false),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    };

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (endpoint) {
      s3Config.endpoint = endpoint;
    }

    this.s3Client = new S3Client(s3Config);
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const ext = path.extname(options.originalName);
    const folder = options.folder || 'uploads';
    const tenantPrefix = options.tenantId ? `${options.tenantId}/` : '';
    const key = `${tenantPrefix}${folder}/${uuidv4()}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: options.buffer,
        ContentType: options.mimeType,
        ACL: options.isPublic ? 'public-read' : 'private',
      }),
    );

    const url = this.cdnUrl ? `${this.cdnUrl}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    this.logger.log(`File uploaded: ${key} (${options.buffer.length} bytes)`);

    return {
      key,
      url,
      bucket: this.bucket,
      contentType: options.mimeType,
      size: options.buffer.length,
    };
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.log(`File deleted: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
