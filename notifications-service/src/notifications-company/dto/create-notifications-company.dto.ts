import { IsString, IsNumber, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { NotificationCompanyType } from '../notificationsCompany.model';

export class CreateNotificationsCompanyDto {
    @IsNumber() companyId: number;
    @IsNumber() customerId: number;
    @IsEnum(NotificationCompanyType) type: NotificationCompanyType;
    @IsString() text: string;
    @IsString() street: string;
    @IsNumber() number: number;
    @IsOptional() @IsString() schedulingDate: string;
    @IsOptional() @IsString() schedulingStartTime: string;
    @IsOptional() @IsString() schedulingEndTime: string;
    @IsDateString() date: Date;
}