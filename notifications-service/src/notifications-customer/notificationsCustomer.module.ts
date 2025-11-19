import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationsCustomer } from './notificationsCustomer.model';
import { NotificationsCustomerService } from './notificationsCustomer.service';
import { NotificationsCustomerController } from './notificationsCustomer.controller';
import { HttpModule } from 'src/http/http.module';
import { HttpService } from 'src/http/http.service';

@Module({
    imports: [SequelizeModule.forFeature([NotificationsCustomer]), HttpModule],
    controllers: [NotificationsCustomerController],
    providers: [NotificationsCustomerService, HttpService],
    exports: [NotificationsCustomerService],
})

export class NotificationsCustomerModule {}