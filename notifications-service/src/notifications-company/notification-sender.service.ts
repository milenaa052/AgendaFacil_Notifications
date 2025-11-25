import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { NotificationsCompanyService } from './notificationsCompany.service';
import { NotificationCompanyType } from './notificationsCompany.model';

@Injectable()
export class NotificationSenderService implements OnModuleInit {

    constructor(
        private redisService: RedisService,
        private notificationsCompanyService: NotificationsCompanyService
    ) {}

    async onModuleInit() {
        const sub = this.redisService.getSubscriber2(); 
        await sub.subscribe('notification_company_ready_to_send', (err, count) => {
            if (err) {
                console.error('Failed to subscribe to notification_company_ready_to_send: ', err);
            } else {
                console.log(`[SUBSCRIBED] successfully! This company is currently subscribed to ${count} channels.`);
            }
        });

        sub.on('message', async (channel, message) => {
            if (channel === 'notification_company_ready_to_send') {
                let notificationEvent: any = JSON.parse(message);
                
                let existing = await this.notificationsCompanyService.get(notificationEvent.idNotificationCompany);
                
                if (existing) {
                    console.log(`Received order to SEND notification ID ${existing.idNotificationCompany} with type: ${existing.type}`);
                    
                    if (existing.type === NotificationCompanyType.PENDENTE) {
                        console.log(`✉️ Enviando NOTIFICAÇÃO PENDENTE para a empresa ${existing.companyId}: Pendente`);
                    } else if (existing.type === NotificationCompanyType.CONFIRMADO) {
                        console.log(`🎉 Enviando NOTIFICAÇÃO DE CONFIRMAÇÃO para a empresa ${existing.companyId}: Agendamento Confirmado`);
                    } else if (existing.type === NotificationCompanyType.CANCELADO) {
                        console.log(`❌ Enviando NOTIFICAÇÃO DE CANCELAMENTO para a empresa ${existing.companyId}: Agendamento Cancelado`);
                    } else if (existing.type === NotificationCompanyType.FINALIZADO) {
                        console.log(`❔ Enviando NOTIFICAÇÃO DE FINALIZADO para a empresa ${existing.companyId}: Serviço Finalizado?`);
                    } else if (existing.type === NotificationCompanyType.LEMBRETE) {
                        console.log(`🔔 Enviando NOTIFICAÇÃO DE LEMBRETE para a empresa ${existing.companyId}: Lembrete`);
                    } else if (existing.type === NotificationCompanyType.CONCLUIDO) {
                        console.log(`✅ Enviando NOTIFICAÇÃO DE CONCLUÍDO para a empresa ${existing.companyId}: Agendamento Concluído`);
                    } else if (existing.type === NotificationCompanyType.AVALIACAO) {
                        console.log(`✨ Enviando NOTIFICAÇÃO DE AVALIAÇÃO para a empresa ${existing.companyId}: Avaliar Atendimento`);
                    } else {
                        console.log(`⚠️ Tipo de notificação ${existing.type} sem regra de envio definida.`);
                    }
                }
            }
        });
    }
}