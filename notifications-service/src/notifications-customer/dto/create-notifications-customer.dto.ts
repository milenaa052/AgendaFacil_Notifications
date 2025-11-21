import { IsString, IsNumber, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { NotificationCustomerType } from '../notificationsCustomer.model';

export class CreateNotificationsCustomerDto {
    @IsNumber() customerId: number;
    @IsNumber() companyId: number;
    @IsEnum(NotificationCustomerType) type: NotificationCustomerType;
    @IsString() text: string;
    @IsString() profession: string;
    @IsOptional() @IsString() schedulingDate: string;
    @IsOptional() @IsString() schedulingStartTime: string;
    @IsOptional() @IsString() schedulingEndTime: string;
    @IsDateString() date: Date;
}