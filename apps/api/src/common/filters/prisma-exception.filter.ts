import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Response, Request } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const fields = (exception.meta?.target as string[]) || ['field'];
        message = `A record with this ${fields.join(', ')} already exists`;
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      }
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        const field = (exception.meta?.field_name as string) || 'field';
        message = `Invalid reference: related ${field} does not exist`;
        break;
      }
      case 'P2014': {
        status = HttpStatus.BAD_REQUEST;
        message = 'The change you are trying to make would violate a required relation';
        break;
      }
      case 'P2016': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Query interpretation error';
        break;
      }
      case 'P2021': {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database table not found';
        break;
      }
      case 'P2022': {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database column not found';
        break;
      }
      default: {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'An unexpected database error occurred';
        this.logger.error(
          `Unhandled Prisma error code: ${exception.code}`,
          exception.stack,
        );
      }
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      error: HttpStatus[status],
      message: [message],
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(
      `Prisma error ${exception.code}: ${message} - ${request.method} ${request.url}`,
    );

    response.status(status).json(errorResponse);
  }
}
