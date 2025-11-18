import { IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { NotificationCompanyType } from '../notificationsCompany.model';

export class CreateNotificationsCompanyDto {
    @IsNumber() companyId: number;
    @IsNumber() customerId: number;
    @IsEnum(NotificationCompanyType) type: NotificationCompanyType;
    @IsString() text: string;
    @IsString() street: string;
    @IsNumber() number: number;
    @IsDateString() date: Date;
}