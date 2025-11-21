import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationsCompany } from './notificationsCompany.model';
import { CreateNotificationsCompanyDto } from './dto/create-notifications-company.dto';
import { UpdateNotificationCompanyDto } from './dto/update-notifications-company.dto';
import { NotificationCompanyType } from './notificationsCompany.model';
import { HttpService } from 'src/http/http.service';

export interface CompanyResponse {
    idCompany: number;
    name: string;
}

export interface CustomerResponse {
    idCustomer: number;
    name: string;
    street: string;
    number: string;
    phone: string;
}

@Injectable()
export class NotificationsCompanyService {
    constructor(
        @InjectModel(NotificationsCompany) private notificationCompanyModel: typeof NotificationsCompany,
        private http: HttpService
    ) {}

    async create(createNotificationCompanyDto: CreateNotificationsCompanyDto, token: string): Promise<NotificationsCompany> {
        const requiredFields = ['companyId', 'customerId', 'type', 'text', 'street', 'number', 'date'];
        for (const field of requiredFields) {
            if (!createNotificationCompanyDto[field]) {
                throw new BadRequestException('Todos os campos são obrigatórios!');
            }
        }

        let customer;
        try {
            const response = await this.http.instance.get(`customer/${createNotificationCompanyDto.customerId}`, {
                headers: { Authorization: token }
            });
            customer = response.data;
        } catch (error) {

            if (error.response?.status === 404) {
                throw new NotFoundException('Cliente não encontrado!');
            }

            throw new BadRequestException(
                error.response?.data?.message || 'Erro ao validar cliente'
            );
        }

        let company;
        try {
            const response = await this.http.instance.get(`company/${createNotificationCompanyDto.companyId}`, {
                headers: { Authorization: token }
            });
            company = response.data;
        } catch (error) {

            if (error.response?.status === 404) {
                throw new NotFoundException('Empresa não encontrada!');
            }

            throw new BadRequestException(
                error.response?.data?.message || 'Erro ao validar empresa'
            );
        }

        const validType = [
            NotificationCompanyType.PENDENTE,
            NotificationCompanyType.CONFIRMADO,
            NotificationCompanyType.CANCELADO,
            NotificationCompanyType.FINALIZADO,
            NotificationCompanyType.LEMBRETE,
            NotificationCompanyType.CONCLUIDO,
            NotificationCompanyType.AVALIACAO
        ];
        if (createNotificationCompanyDto.type && !validType.includes(createNotificationCompanyDto.type)) {
            throw new BadRequestException('Type deve ser PENDENTE, CONFIRMADO, CANCELADO, FINALIZADO, LEMBRETE, CONCLUIDO ou AVALIACAO!');
        }

        const NotificationCompanyData = {
            companyId: createNotificationCompanyDto.companyId,
            customerId: createNotificationCompanyDto.customerId,
            type: createNotificationCompanyDto.type,
            text: createNotificationCompanyDto.text,
            street: createNotificationCompanyDto.street,
            number: createNotificationCompanyDto.number,
            schedulingDate: createNotificationCompanyDto.schedulingDate,
            schedulingStartTime: createNotificationCompanyDto.schedulingStartTime,
            schedulingEndTime: createNotificationCompanyDto.schedulingEndTime,
            date: createNotificationCompanyDto.date
        };

        return await this.notificationCompanyModel.create(NotificationCompanyData);
    }

    async findAll() {
        return await this.notificationCompanyModel.findAll();
    }

    async findById(id: number) {
        const notificationCompany = await this.notificationCompanyModel.findByPk(id);
        
        if (!notificationCompany) throw new NotFoundException('Notificação não encontrada!');
        return notificationCompany;
    }

    async findByCompanyId(companyId: number, token: string) {
        let company: CompanyResponse;
        try {
            const response = await this.http.instance.get<CompanyResponse>(`company/${companyId}`, {
                headers: { Authorization: token }
            });

            company = response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new NotFoundException('Empresa não encontrada!');
            }

            throw new BadRequestException(error.response?.data?.message || 'Erro ao validar empresa');
        }

        const notifications = await this.notificationCompanyModel.findAll({
            where: { companyId },
            order: [['date', 'DESC']]
        });

        if (notifications.length === 0) {
            return [];
        }

        const customerIds = [...new Set(notifications.map(s => s.customerId))];

        let customers: CustomerResponse[];
        try {
            customers = await Promise.all(
                customerIds.map(async (id) => {
                    const res = await this.http.instance.get<CustomerResponse>(`customer/${id}`, {
                        headers: { Authorization: token }
                    });
                    return res.data;
                })
            );
        } catch (error) {
            if (error.response?.status === 404) {
                throw new NotFoundException('Algum cliente vinculado a notificação não foi encontrado!');
            }

            throw new BadRequestException(error.response?.data?.message || 'Erro ao validar cliente(s)');
        }

        const customerMap = new Map<number, CustomerResponse>();
        customers.forEach(c => customerMap.set(c.idCustomer, c));

        return notifications.map(notification => {
            const customer = customerMap.get(notification.customerId);

            return {
                idNotificationCompany: notification.idNotificationCompany,
                type: notification.type,
                text: notification.text,
                schedulingDate: notification.schedulingDate,
                schedulingStartTime: notification.schedulingStartTime,
                schedulingEndTime: notification.schedulingEndTime,
                date: notification.date,

                company: {
                    idCompany: company.idCompany,
                    name: company.name
                },

                customer: customer
                    ? {
                        idCustomer: customer.idCustomer,
                        name: customer.name,
                        street: customer.street,
                        number: customer.number,
                        phone: customer.phone
                    }
                    : null
            };
        });
    }

    async update(id: number, dto: UpdateNotificationCompanyDto) {
        const notification = await this.notificationCompanyModel.findByPk(id);
        if (!notification) {
            throw new NotFoundException('Notificação não encontrada!');
        }

        if (dto.customerId && dto.customerId !== notification.customerId) { 
            throw new BadRequestException('Cliente não pode ser alterado!');
        }

        if (dto.companyId && dto.companyId !== notification.companyId) { 
            throw new BadRequestException('Empresa não pode ser alterado!');
        }

        const validType = [
            NotificationCompanyType.PENDENTE,
            NotificationCompanyType.CONFIRMADO,
            NotificationCompanyType.CANCELADO,
            NotificationCompanyType.FINALIZADO,
            NotificationCompanyType.LEMBRETE,
            NotificationCompanyType.CONCLUIDO,
            NotificationCompanyType.AVALIACAO
        ];
        if (dto.type && !validType.includes(dto.type)) {
            throw new BadRequestException('Type deve ser PENDENTE, CONFIRMADO, CANCELADO, FINALIZADO, LEMBRETE, CONCLUIDO ou AVALIACAO!');
        }

        const allowedFields = ['type', 'text', 'street', 'number', 'date'];
        for (const key of allowedFields) {
            if (dto[key] !== undefined) {
                notification[key] = dto[key];
            }
        }

        await notification.save();
        return notification;
    }
}