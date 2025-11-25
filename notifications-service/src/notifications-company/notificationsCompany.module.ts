import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationsCompany } from './notificationsCompany.model';
import { NotificationsCompanyService } from './notificationsCompany.service';
import { NotificationsCompanyController } from './notificationsCompany.controller';
import { HttpModule } from 'src/http/http.module';
import { HttpService } from 'src/http/http.service';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';
import { NotificationStatusProcessorService } from './notification-status-processor.service';
import { NotificationSenderService } from './notification-sender.service';

@Module({
    imports: [SequelizeModule.forFeature([NotificationsCompany]), HttpModule, RedisModule],
    controllers: [NotificationsCompanyController],
    providers: [NotificationsCompanyService, HttpService, RedisService, NotificationStatusProcessorService, NotificationSenderService],
    exports: [NotificationsCompanyService],
})

export class NotificationsCompanyModule {}