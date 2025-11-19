import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationsCompanyModule } from './notifications-company/notificationsCompany.module';
import { NotificationsCustomerModule } from './notifications-customer/notificationsCustomer.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5435,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'notificationsdb',
      autoLoadModels: true,
      synchronize: true,
      logging: false,
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' }
    }),

    NotificationsCompanyModule,
    NotificationsCustomerModule
  ],
  providers: [JwtStrategy]
})
export class AppModule {}