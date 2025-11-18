import { Body, Controller, Get, Param, Post, Req, Put, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NotificationsCompanyService } from './notificationsCompany.service';
import { CreateNotificationsCompanyDto } from './dto/create-notifications-company.dto';
import { UpdateNotificationCompanyDto } from './dto/update-notifications-company.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications-company')
export class NotificationsCompanyController {
    constructor(private readonly notificationsCompanyService: NotificationsCompanyService) {}

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() dto: CreateNotificationsCompanyDto, @Req() req) {
        const token = req.headers.authorization;
        return this.notificationsCompanyService.create(dto, token);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.notificationsCompanyService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.notificationsCompanyService.findById(id);
    }

    @Get('/company/:companyId')
    @UseGuards(AuthGuard('jwt'))
    async findByCompanyId(@Param('companyId', ParseIntPipe) companyId: number, @Req() req) {
        const token = req.headers.authorization;
        return this.notificationsCompanyService.findByCompanyId(companyId, token);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateNotificationsCompanyDto: UpdateNotificationCompanyDto
    ) {
        return await this.notificationsCompanyService.update(id, updateNotificationsCompanyDto);
    }
}