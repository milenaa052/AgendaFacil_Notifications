import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationsCompany } from './notificationsCompany.model';
import { NotificationsCompanyService } from './notificationsCompany.service';
import { NotificationsCompanyController } from './notificationsCompany.controller';
import { HttpModule } from 'src/http/http.module';
import { HttpService } from 'src/http/http.service';

@Module({
    imports: [SequelizeModule.forFeature([NotificationsCompany]), HttpModule],
    controllers: [NotificationsCompanyController],
    providers: [NotificationsCompanyService, HttpService],
    exports: [NotificationsCompanyService],
})

export class NotificationsCompanyModule {}