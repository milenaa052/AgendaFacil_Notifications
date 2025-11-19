import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationsCustomer } from './notificationsCustomer.model';
import { CreateNotificationsCustomerDto } from './dto/create-notifications-customer.dto';
import { UpdateNotificationCustomerDto } from './dto/update-notifications-customer.dto';
import { NotificationCustomerType } from './notificationsCustomer.model';
import { HttpService } from 'src/http/http.service';

export interface CustomerResponse {
    idCustomer: number;
    name: string;
}

export interface CompanyResponse {
    idCompany: number;
    name: string;
    profession: string;
    street: string;
    number: string;
    phone: string;
}

@Injectable()
export class NotificationsCustomerService {
    constructor(
        @InjectModel(NotificationsCustomer) private notificationCustomerModel: typeof NotificationsCustomer,
        private http: HttpService
    ) {}

    async create(createNotificationCustomerDto: CreateNotificationsCustomerDto, token: string): Promise<NotificationsCustomer> {
        const requiredFields = ['customerId', 'companyId', 'type', 'text', 'profession', 'date'];
        for (const field of requiredFields) {
            if (!createNotificationCustomerDto[field]) {
                throw new BadRequestException('Todos os campos são obrigatórios!');
            }
        }

        let customer;
        try {
            const response = await this.http.instance.get(`customer/${createNotificationCustomerDto.customerId}`, {
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
            const response = await this.http.instance.get(`company/${createNotificationCustomerDto.companyId}`, {
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
            NotificationCustomerType.PENDENTE,
            NotificationCustomerType.CONFIRMADO,
            NotificationCustomerType.CANCELADO,
            NotificationCustomerType.LEMBRETE,
            NotificationCustomerType.CONCLUIDO,
            NotificationCustomerType.AVALIACAO
        ];
        if (createNotificationCustomerDto.type && !validType.includes(createNotificationCustomerDto.type)) {
            throw new BadRequestException('Type deve ser PENDENTE, CONFIRMADO, CANCELADO, LEMBRETE, CONCLUIDO ou AVALIACAO!');
        }

        const NotificationCustomerData = {
            customerId: createNotificationCustomerDto.customerId,
            companyId: createNotificationCustomerDto.companyId,
            type: createNotificationCustomerDto.type,
            text: createNotificationCustomerDto.text,
            profession: createNotificationCustomerDto.profession,
            date: createNotificationCustomerDto.date
        };

        return await this.notificationCustomerModel.create(NotificationCustomerData);
    }

    async findAll() {
        return await this.notificationCustomerModel.findAll();
    }

    async findById(id: number) {
        const notificationCustomer = await this.notificationCustomerModel.findByPk(id);
        
        if (!notificationCustomer) throw new NotFoundException('Notificação não encontrada!');
        return notificationCustomer;
    }

    async findByCustomerId(customerId: number, token: string) {
        let customer: CustomerResponse;
        try {
            const response = await this.http.instance.get<CustomerResponse>(`customer/${customerId}`, {
                headers: { Authorization: token }
            });

            customer = response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new NotFoundException('Cliente não encontrado!');
            }

            throw new BadRequestException(error.response?.data?.message || 'Erro ao validar empresa');
        }

        const notifications = await this.notificationCustomerModel.findAll({
            where: { customerId },
            order: [['date', 'DESC']]
        });

        if (notifications.length === 0) {
            return [];
        }

        const companyIds = [...new Set(notifications.map(s => s.companyId))];

        let companies: CompanyResponse[];
        try {
            companies = await Promise.all(
                companyIds.map(async (id) => {
                    const res = await this.http.instance.get<CompanyResponse>(`company/${id}`, {
                        headers: { Authorization: token }
                    });
                    return res.data;
                })
            );
        } catch (error) {
            if (error.response?.status === 404) {
                throw new NotFoundException('Alguma empresa vinculada ao agendamento não foi encontrada!');
            }

            throw new BadRequestException(error.response?.data?.message || 'Erro ao validar empresa(s)');
        }

        const companyMap = new Map<number, CompanyResponse>();
        companies.forEach(c => companyMap.set(c.idCompany, c));

        return notifications.map(notification => {
            const company = companyMap.get(notification.companyId);

            return {
                idNotificationCustomer: notification.idNotificationCustomer,
                type: notification.type,
                text: notification.text,
                date: notification.date,

                customer: {
                    idCustomer: customer.idCustomer,
                    name: customer.name
                },

                company: company ? {
                    idCompany: company.idCompany,
                    name: company.name,
                    profession: company.profession,
                    street: company.street,
                    number: company.number,
                    phone: company.phone
                } : null
            };
        });
    }

    async update(id: number, dto: UpdateNotificationCustomerDto) {
        const notification = await this.notificationCustomerModel.findByPk(id);
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
            NotificationCustomerType.PENDENTE,
            NotificationCustomerType.CONFIRMADO,
            NotificationCustomerType.CANCELADO,
            NotificationCustomerType.LEMBRETE,
            NotificationCustomerType.CONCLUIDO,
            NotificationCustomerType.AVALIACAO
        ];
        if (dto.type && !validType.includes(dto.type)) {
            throw new BadRequestException('Type deve ser PENDENTE, CONFIRMADO, CANCELADO, LEMBRETE, CONCLUIDO ou AVALIACAO!');
        }

        const allowedFields = ['type', 'text', 'profession', 'date'];
        for (const key of allowedFields) {
            if (dto[key] !== undefined) {
                notification[key] = dto[key];
            }
        }

        await notification.save();
        return notification;
    }
}