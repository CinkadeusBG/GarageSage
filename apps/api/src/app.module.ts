import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule }      from '@garagesage/prisma';
import { AuthModule }        from './auth/auth.module';
import { VehiclesModule }    from './vehicles/vehicles.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { FuelModule }        from './fuel/fuel.module';
import { RemindersModule }   from './reminders/reminders.module';
import { ReportsModule }     from './reports/reports.module';
import { AiModule }          from './ai/ai.module';
import { UploadsModule }     from './uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    VehiclesModule,
    MaintenanceModule,
    FuelModule,
    RemindersModule,
    ReportsModule,
    AiModule,
    UploadsModule,

    // Serve Angular build in production
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'frontend'),
            exclude: ['/api/(.*)'],
            serveStaticOptions: { index: false },
          }),
        ]
      : []),
  ],
})
export class AppModule {}
