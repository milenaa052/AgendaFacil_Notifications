import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationsCompany } from './notificationsCompany.model';
import { CreateNotificationsCompanyDto } from './dto/create-notifications-company.dto';
import { UpdateNotificationCompanyDto } from './dto/update-notifications-company.dto';
import { NotificationCompanyType } from './notificationsCompany.model';
import { HttpService } from 'src/http/http.service';
import { RedisService } from 'src/redis/redis.service';

export interface CompanyResponse {
    idCompany: number;
    name: string;
    profession: string;
    street: string;
    number: number;
    phone: string;
}

export interface CustomerResponse {
    idCustomer: number;
    name: string;
    street: string;
    number: string;
    phone: string;
}

export interface SchedulingCompanyResponse {
    idSchedulingCompany: number;
    companyId: number;
    customerId: number;
    schedulingCustomerId: number;
    title: string;
    startDate: string;
    endDate: string;
    startHour: string;
    endHour: string;
    status: string;
    notificationSent: boolean;
}

@Injectable()
export class NotificationsCompanyService {
    constructor(
        @InjectModel(NotificationsCompany) private notificationCompanyModel: typeof NotificationsCompany,
        private http: HttpService,
        private redis: RedisService
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
            const response = await this.http.users.get(`customer/${createNotificationCompanyDto.customerId}`, {
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
            const response = await this.http.users.get(`company/${createNotificationCompanyDto.companyId}`, {
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

        let scheduling = null;
        if (createNotificationCompanyDto.schedulingCompanyId) {
            try {
                const response = await this.http.scheduling.get(`scheduling-company/${createNotificationCompanyDto.schedulingCompanyId}`, {
                    headers: { Authorization: token }
                });
                scheduling = response.data;

            } catch (error) {
                if (error.response?.status === 404) {
                    throw new NotFoundException('Agendamento não encontrado!');
                }

                throw new BadRequestException(
                    error.response?.data?.message || 'Erro ao validar agendamento'
                );
            }
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
            schedulingCompanyId: createNotificationCompanyDto.schedulingCompanyId,
            schedulingDate: createNotificationCompanyDto.schedulingDate,
            schedulingStartTime: createNotificationCompanyDto.schedulingStartTime,
            schedulingEndTime: createNotificationCompanyDto.schedulingEndTime,
            date: createNotificationCompanyDto.date
        };

        const notificationCompany = await this.notificationCompanyModel.create(NotificationCompanyData);

        await this.redis.getPublisher().publish('notification_company_status_changed', JSON.stringify({
            idNotificationCompany: notificationCompany.idNotificationCompany,
            companyId: notificationCompany.companyId,
            newType: notificationCompany.type
        }));
        console.log(`[PUBLISHED] notification_company_status_changed event to Redis for type: ${notificationCompany.type}`);

        const cacheKey = `company:${createNotificationCompanyDto.companyId}`;
        await this.redis.getClient().del(cacheKey);
        console.log(`🗑️ Cache invalidado: ${cacheKey}`);

        return notificationCompany;
    }

    async get(id: number) {
        return await this.notificationCompanyModel.findByPk(id);
    }
    
    async update(notification: NotificationsCompany): Promise<NotificationsCompany> {
        await notification.save();
        return notification;
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
        if (!companyId) {
            throw new BadRequestException("O ID da empresa é obrigatório!");
        }

        const cacheKey = `company:${companyId}`;

        try {
            const cache = await this.redis.getClient();

            const pong = await cache.ping();
            console.log("Redis ping response:", pong);

            const cachedData = await cache.get(cacheKey);
            if (cachedData) {
                console.log(`♻️ Retornando notificações da empresa do cache (${cacheKey})`);
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.log("❌ Erro ao acessar o cache:", error);
        }

        let company: CompanyResponse;
        try {
            const response = await this.http.users.get<CompanyResponse>(`company/${companyId}`, {
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
                    const res = await this.http.users.get<CustomerResponse>(`customer/${id}`, {
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

        const validSchedulingIds: number[] = [...new Set(
            notifications.map(n => n.schedulingCompanyId)
        )].filter((id): id is number => id !== null && id !== undefined);

        let schedulings: SchedulingCompanyResponse[] = [];

        if (validSchedulingIds.length > 0) {
            try {
                const results = await Promise.allSettled(
                    validSchedulingIds.map(async (id) => {
                        const res = await this.http.scheduling.get<SchedulingCompanyResponse>(`scheduling-company/${id}`, {
                            headers: { Authorization: token }
                        });
                        return res.data;
                    })
                );

                schedulings = results
                    .filter(result => result.status === 'fulfilled')
                    .map(result => (result as PromiseFulfilledResult<SchedulingCompanyResponse>).value);
            } catch (error) {
                throw new BadRequestException(error.response?.data?.message || 'Erro ao validar agendamentos da empresa');
            }
        }

        const schedulingMap = new Map<number, SchedulingCompanyResponse>();
        schedulings.forEach(s => schedulingMap.set(s.idSchedulingCompany, s));

        const result = notifications.map(notification => {
            const customer = customerMap.get(notification.customerId);
            const scheduling = schedulingMap.get(notification.schedulingCompanyId);

            return {
                idNotificationCompany: notification.idNotificationCompany,
                type: notification.type,
                text: notification.text,
                schedulingCompanyId: notification.schedulingCompanyId,
                schedulingDate: notification.schedulingDate,
                schedulingStartTime: notification.schedulingStartTime,
                schedulingEndTime: notification.schedulingEndTime,
                date: notification.date,

                company: {
                    idCompany: company.idCompany,
                    name: company.name,
                    profession: company.profession,
                    street: company.street,
                    number: company.number,
                    phone: company.phone
                },

                customer: customer
                    ? {
                        idCustomer: customer.idCustomer,
                        name: customer.name,
                        street: customer.street,
                        number: customer.number,
                        phone: customer.phone
                    }
                    : null,

                scheduling: scheduling
                    ? {
                        idSchedulingCompany: scheduling.idSchedulingCompany,
                        companyId: scheduling.companyId,
                        customerId: scheduling.customerId,
                        schedulingCustomerId: scheduling.schedulingCustomerId,
                        title: scheduling.title,
                        startDate: scheduling.startDate,
                        endDate: scheduling.endDate,
                        startHour: scheduling.startHour,
                        endHour: scheduling.endHour,
                        status: scheduling.status,
                        notificationSent: scheduling.notificationSent
                    }
                    : null
            };
        });

        try {
            await this.redis.getClient().set(cacheKey, JSON.stringify(result), 'EX', 300);
            console.log(`💾 Dados das notificações da empresa salvos no cache (${cacheKey}) com TTL de 300s`);
        } catch(error) {
            console.log("❌ Erro ao salvar no cache:", error);
        }

        return result;
    }

    async invalidateNotificationsCompanyCacheById(companyId: number) {
        const pattern = `company:${companyId}*`;
        const keys = await this.redis.getClient().keys(pattern);

        for (const key of keys) {
            await this.redis.getClient().del(key);
            console.log(`🗑️ Cache da empresa invalidado: ${key}`);
        }
    }

    async updateNotificationCompany(id: number, dto: UpdateNotificationCompanyDto) {
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

        if (notification.schedulingCompanyId) {
            if (dto.schedulingCompanyId) {
                if (dto.schedulingCompanyId !== notification.schedulingCompanyId) {
                    throw new BadRequestException('Agendamento da empresa não pode ser alterado!');
                }
            }
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

        const allowedFields = ['type', 'text', 'street', 'number', 'schedulingCompanyId', 'schedulingDate', 'schedulingStartTime', 'schedulingEndTime', 'date'];
        for (const key of allowedFields) {
            if (dto[key] !== undefined) {
                notification[key] = dto[key];
            }
        }

        await notification.save();

        await this.redis.getPublisher().publish('notification_company_status_changed', JSON.stringify({
            idNotificationCompany: notification.idNotificationCompany,
            companyId: notification.companyId,
            newType: notification.type
        }));
        console.log(`[PUBLISHED] notification_company_status_changed event to Redis for type: ${notification.type}`);

        const cacheKey = `company:${notification.companyId}`;
        await this.redis.getClient().del(cacheKey);
        console.log(`🗑️ Cache invalidado: ${cacheKey}`);

        return notification;
    }
}