import { IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { NotificationCustomerType } from '../notificationsCustomer.model';

export class CreateNotificationsCustomerDto {
    @IsNumber() customerId: number;
    @IsNumber() companyId: number;
    @IsEnum(NotificationCustomerType) type: NotificationCustomerType;
    @IsString() text: string;
    @IsString() profession: string;
    @IsDateString() date: Date;
}