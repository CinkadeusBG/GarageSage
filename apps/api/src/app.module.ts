import { Module } from '@nestjs/common';

import { PrismaModule }      from '@garagesage/prisma';
import { AuthModule }        from './auth/auth.module';
import { VehiclesModule }    from './vehicles/vehicles.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { RemindersModule }   from './reminders/reminders.module';
import { ReportsModule }     from './reports/reports.module';
import { UploadsModule }     from './uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    VehiclesModule,
    MaintenanceModule,
    RemindersModule,
    ReportsModule,
    UploadsModule,
  ],
})
export class AppModule {}
