import { Table, Column, Model, DataType } from 'sequelize-typescript';

export enum NotificationCompanyType {
    PENDENTE = 'Pendente',
    CONFIRMADO = 'Confirmado',
    CANCELADO = 'Cancelado',
    FINALIZADO = 'Serviço Finalizado?',
    LEMBRETE = 'Lembrete',
    CONCLUIDO = 'Concluído',
    AVALIACAO = 'Avaliação'
}

export interface NotificationCompanyCreationAttributes {
    companyId: number;
    customerId: number;
    type: NotificationCompanyType
    text: string;
    street: string;
    number: number;
    date: Date
}

@Table({ tableName: 'NotificationCompany', timestamps: false, modelName: 'NotificationCompany' })
export class NotificationsCompany extends Model<NotificationsCompany, NotificationCompanyCreationAttributes> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'idNotificationCompany'
    })
    declare idNotificationCompany: number;

    @Column({ 
        type: DataType.INTEGER,
        allowNull: false,
        field: 'companyId'
    })
    declare companyId: number;

    @Column({ 
        type: DataType.INTEGER,
        allowNull: false,
        field: 'customerId'
    })
    declare customerId: number;

    @Column({ 
        type: DataType.ENUM(...Object.values(NotificationCompanyType)),
        allowNull: false
    })
    declare type: NotificationCompanyType;

    @Column({ 
        type: DataType.STRING,
        allowNull: false 
    })
    declare text: string;

    @Column({ 
        type: DataType.STRING,
        allowNull: false 
    })
    declare street: string;

    @Column({ 
        type: DataType.INTEGER,
        allowNull: false 
    })
    declare number: number;

    @Column({ 
        type: DataType.DATE,
        allowNull: false,
        defaultValue: new Date()
    })
    declare date: Date;
}