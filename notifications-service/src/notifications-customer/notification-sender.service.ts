import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { NotificationsCustomerService } from './notificationsCustomer.service';
import { NotificationCustomerType } from './notificationsCustomer.model';

@Injectable()
export class NotificationSenderService implements OnModuleInit {

    constructor(
        private redisService: RedisService,
        private notificationsCustomerService: NotificationsCustomerService
    ) {}

    async onModuleInit() {
        const sub = this.redisService.getSubscriber2(); 
        await sub.subscribe('notification_ready_to_send', (err, count) => {
            if (err) {
                console.error('Failed to subscribe to notification_ready_to_send: ', err);
            } else {
                console.log(`[SUBSCRIBED] successfully! This client is currently subscribed to ${count} channels.`);
            }
        });

        sub.on('message', async (channel, message) => {
            if (channel === 'notification_ready_to_send') {
                let notificationEvent: any = JSON.parse(message);
                
                let existing = await this.notificationsCustomerService.get(notificationEvent.idNotificationCustomer);
                
                if (existing) {
                    console.log(`Received order to SEND notification ID ${existing.idNotificationCustomer} with type: ${existing.type}`);
                    
                    if (existing.type === NotificationCustomerType.PENDENTE) {
                        console.log(`✉️ Enviando NOTIFICAÇÃO PENDENTE para o cliente ${existing.customerId}: Pendente`);
                    } else if (existing.type === NotificationCustomerType.CONFIRMADO) {
                        console.log(`🎉 Enviando NOTIFICAÇÃO DE CONFIRMAÇÃO para o cliente ${existing.customerId}: Agendamento Confirmado`);
                    } else if (existing.type === NotificationCustomerType.CANCELADO) {
                        console.log(`❌ Enviando NOTIFICAÇÃO DE CANCELAMENTO para o cliente ${existing.customerId}: Agendamento Cancelado`);
                    } else if (existing.type === NotificationCustomerType.LEMBRETE) {
                        console.log(`🔔 Enviando NOTIFICAÇÃO DE LEMBRETE para o cliente ${existing.customerId}: Lembrete`);
                    } else if (existing.type === NotificationCustomerType.CONCLUIDO) {
                        console.log(`✅ Enviando NOTIFICAÇÃO DE CONCLUÍDO para o cliente ${existing.customerId}: Agendamento Concluído`);
                    } else if (existing.type === NotificationCustomerType.AVALIACAO) {
                        console.log(`✨ Enviando NOTIFICAÇÃO DE AVALIAÇÃO para o cliente ${existing.customerId}: Avaliar Atendimento`);
                    } else {
                        console.log(`⚠️ Tipo de notificação ${existing.type} sem regra de envio definida.`);
                    }
                }
            }
        });
    }
}