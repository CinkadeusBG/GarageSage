// maintenance.module.ts
import { Module }               from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService }    from './maintenance.service';
import { AiModule }             from '../ai/ai.module';

@Module({
  imports:     [AiModule],
  controllers: [MaintenanceController],
  providers:   [MaintenanceService],
})
export class MaintenanceModule {}
