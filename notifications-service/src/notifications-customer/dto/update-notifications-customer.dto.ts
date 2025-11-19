import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { NotificationCustomerType } from '../notificationsCustomer.model';

export class UpdateNotificationCustomerDto {
    @IsOptional() @IsNumber() customerId?: number;
    @IsOptional() @IsNumber() companyId?: number;
    @IsOptional() @IsEnum(NotificationCustomerType) type?: NotificationCustomerType;
    @IsOptional() @IsString() text?: string;
    @IsOptional() @IsString() profession?: string;
    @IsOptional() @IsDateString() startDate?: Date;
}