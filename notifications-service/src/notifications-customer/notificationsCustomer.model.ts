import { Table, Column, Model, DataType } from 'sequelize-typescript';

export enum NotificationCustomerType {
    PENDENTE = 'Pendente',
    CONFIRMADO = 'Confirmado',
    CANCELADO = 'Cancelado',
    LEMBRETE = 'Lembrete',
    CONCLUIDO = 'Concluído',
    AVALIACAO = 'Avaliação'
}

export interface NotificationCustomerCreationAttributes {
    customerId: number;
    companyId: number;
    type: NotificationCustomerType
    text: string;
    profession: string;
    date: Date
}

@Table({ tableName: 'NotificationCustomer', timestamps: false, modelName: 'NotificationCustomer' })
export class NotificationsCustomer extends Model<NotificationsCustomer, NotificationCustomerCreationAttributes> {
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'idNotificationCustomer'
    })
    declare idNotificationCustomer: number;

    @Column({ 
        type: DataType.INTEGER,
        allowNull: false,
        field: 'customerId'
    })
    declare customerId: number;

    @Column({ 
        type: DataType.INTEGER,
        allowNull: false,
        field: 'companyId'
    })
    declare companyId: number;

    @Column({ 
        type: DataType.ENUM(...Object.values(NotificationCustomerType)),
        allowNull: false
    })
    declare type: NotificationCustomerType;

    @Column({ 
        type: DataType.STRING,
        allowNull: false 
    })
    declare text: string;

    @Column({ 
        type: DataType.STRING,
        allowNull: false 
    })
    declare profession: string;

    @Column({ 
        type: DataType.DATE,
        allowNull: false,
        defaultValue: new Date()
    })
    declare date: Date;
}