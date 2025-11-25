import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationsCustomer } from './notificationsCustomer.model';
import { CreateNotificationsCustomerDto } from './dto/create-notifications-customer.dto';
import { UpdateNotificationCustomerDto } from './dto/update-notifications-customer.dto';
import { NotificationCustomerType } from './notificationsCustomer.model';
import { HttpService } from 'src/http/http.service';
import { RedisService } from 'src/redis/redis.service';

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
        private http: HttpService,
        private redis: RedisService
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
            const response = await this.http.users.get(`customer/${createNotificationCustomerDto.customerId}`, {
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
            const response = await this.http.users.get(`company/${createNotificationCustomerDto.companyId}`, {
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
            schedulingDate: createNotificationCustomerDto.schedulingDate,
            schedulingStartTime: createNotificationCustomerDto.schedulingStartTime,
            schedulingEndTime: createNotificationCustomerDto.schedulingEndTime,
            date: createNotificationCustomerDto.date
        };

        const notificationCustomer = await this.notificationCustomerModel.create(NotificationCustomerData);

        await this.redis.getPublisher().publish('notification_status_changed', JSON.stringify({
            idNotificationCustomer: notificationCustomer.idNotificationCustomer,
            customerId: notificationCustomer.customerId,
            newType: notificationCustomer.type
        }));
        console.log(`[PUBLISHED] notification_status_changed event to Redis for type: ${notificationCustomer.type}`);

        const cacheKey = `customer:${createNotificationCustomerDto.customerId}`;
        await this.redis.getClient().del(cacheKey);
        console.log(`🗑️ Cache invalidado: ${cacheKey}`);

        return notificationCustomer;
    }

    async get(id: number) {
        return await this.notificationCustomerModel.findByPk(id);
    }

    async update(notification: NotificationsCustomer): Promise<NotificationsCustomer> {
        await notification.save();
        return notification;
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
        if (!customerId) {
            throw new BadRequestException("O ID do cliente é obrigatório!");
        }

        const cacheKey = `customer:${customerId}`;

        try {
            const cache = await this.redis.getClient();

            const pong = await cache.ping();
            console.log("Redis ping response:", pong);

            const cachedData = await cache.get(cacheKey);
            if (cachedData) {
                console.log(`♻️ Retornando notificações do cliente do cache (${cacheKey})`);
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.log("❌ Erro ao acessar o cache:", error);
        }

        let customer: CustomerResponse;
        try {
            const response = await this.http.users.get<CustomerResponse>(`customer/${customerId}`, {
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
                    const res = await this.http.users.get<CompanyResponse>(`company/${id}`, {
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

        const result = notifications.map(notification => {
            const company = companyMap.get(notification.companyId);

            return {
                idNotificationCustomer: notification.idNotificationCustomer,
                type: notification.type,
                text: notification.text,
                schedulingDate: notification.schedulingDate,
                schedulingStartTime: notification.schedulingStartTime,
                schedulingEndTime: notification.schedulingEndTime,
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

        try {
            await this.redis.getClient().set(cacheKey, JSON.stringify(result), 'EX', 300);
            console.log(`💾 Dados das notificações do cliente salvos no cache (${cacheKey}) com TTL de 300s`);
        } catch(error) {
            console.log("❌ Erro ao salvar no cache:", error);
        }

        return result;
    }

    async invalidateNotificationsCustomerCacheById(customerId: number) {
        const pattern = `customer:${customerId}*`;
        const keys = await this.redis.getClient().keys(pattern);

        for (const key of keys) {
            await this.redis.getClient().del(key);
            console.log(`🗑️ Cache do cliente invalidado: ${key}`);
        }
    }

    async updateNotificationCustomer(id: number, dto: UpdateNotificationCustomerDto) {
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

        const allowedFields = ['type', 'text', 'profession', 'schedulingDate', 'schedulingStartTime', 'schedulingEndTime', 'date'];
        for (const key of allowedFields) {
            if (dto[key] !== undefined) {
                notification[key] = dto[key];
            }
        }

        await notification.save();

        await this.redis.getPublisher().publish('notification_status_changed', JSON.stringify({
            idNotificationCustomer: notification.idNotificationCustomer,
            customerId: notification.customerId,
            newType: notification.type
        }));
        console.log(`[PUBLISHED] notification_status_changed event to Redis for type: ${notification.type}`);

        const cacheKey = `customer:${notification.customerId}`;
        await this.redis.getClient().del(cacheKey);
        console.log(`🗑️ Cache invalidado: ${cacheKey}`);

        return notification;
    }
}