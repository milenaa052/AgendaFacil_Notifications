import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationsCustomer } from './notificationsCustomer.model';
import { NotificationsCustomerService } from './notificationsCustomer.service';
import { NotificationsCustomerController } from './notificationsCustomer.controller';
import { HttpModule } from 'src/http/http.module';
import { HttpService } from 'src/http/http.service';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';

@Module({
    imports: [SequelizeModule.forFeature([NotificationsCustomer]), HttpModule, RedisModule],
    controllers: [NotificationsCustomerController],
    providers: [NotificationsCustomerService, HttpService, RedisService],
    exports: [NotificationsCustomerService],
})

export class NotificationsCustomerModule {}