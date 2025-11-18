import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { NotificationCompanyType } from '../notificationsCompany.model';

export class UpdateNotificationCompanyDto {
    @IsOptional() @IsNumber() companyId?: number;
    @IsOptional() @IsNumber() customerId?: number;
    @IsOptional() @IsEnum(NotificationCompanyType) type?: NotificationCompanyType;
    @IsOptional() @IsString() text?: string;
    @IsOptional() @IsString() street?: string;
    @IsOptional() @IsNumber() number?: number;
    @IsOptional() @IsDateString() startDate?: Date;
}