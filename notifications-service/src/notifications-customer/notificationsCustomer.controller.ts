import { Body, Controller, Get, Param, Post, Req, Put, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NotificationsCustomerService } from './notificationsCustomer.service';
import { CreateNotificationsCustomerDto } from './dto/create-notifications-customer.dto';
import { UpdateNotificationCustomerDto } from './dto/update-notifications-customer.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications-customer')
export class NotificationsCustomerController {
    constructor(private readonly notificationsCustomerService: NotificationsCustomerService) {}

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() dto: CreateNotificationsCustomerDto, @Req() req) {
        const token = req.headers.authorization;
        return this.notificationsCustomerService.create(dto, token);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.notificationsCustomerService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.notificationsCustomerService.findById(id);
    }

    @Get('/customer/:customerId')
    @UseGuards(AuthGuard('jwt'))
    async findByCustomerId(@Param('customerId', ParseIntPipe) customerId: number, @Req() req) {
        const token = req.headers.authorization;
        return this.notificationsCustomerService.findByCustomerId(customerId, token);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateNotificationsCustomerDto: UpdateNotificationCustomerDto
    ) {
        return await this.notificationsCustomerService.update(id, updateNotificationsCustomerDto);
    }
}