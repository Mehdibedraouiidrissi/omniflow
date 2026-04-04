import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmContactsController, CrmTagsController, CrmCustomFieldsController } from './crm.controller';

@Module({
  controllers: [CrmContactsController, CrmTagsController, CrmCustomFieldsController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
