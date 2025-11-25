import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class NotificationStatusProcessorService implements OnModuleInit {

    constructor(
        private redisService: RedisService,
    ) {}

    async onModuleInit() {
        const sub = this.redisService.getSubscriber(); 
        await sub.subscribe('notification_company_status_changed', (err, count) => {
            if (err) {
                console.error('Failed to subscribe to notification_company_status_changed: ', err);
            } else {
                console.log(`[SUBSCRIBED] successfully! This company is currently subscribed to ${count} channels.`);
            }
        });

        sub.on('message', async (channel, message) => {
            if (channel === 'notification_company_status_changed') {
                console.log(`Received message from channel ${channel}: ${message}`);

                let notificationEvent: any = JSON.parse(message);
                console.log(`[PROCESSING] notification status: ${notificationEvent.newType}`);
                
                await this.redisService.getPublisher().publish('notification_company_ready_to_send', JSON.stringify({
                    idNotificationCompany: notificationEvent.idNotificationCompany,
                    companyId: notificationEvent.companyId,
                    type: notificationEvent.newType
                }));
                console.log(`[PUBLISHED] notification_company_ready_to_send event for type: ${notificationEvent.newType}`);
            }
        });
    }
}