import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class HttpService {

    private usersClient: AxiosInstance;
    private schedulingClient: AxiosInstance;

    constructor(cfg: ConfigService) {

        this.usersClient = axios.create({
            baseURL: cfg.get('USERS_API', 'http://service-users:3000'),
            timeout: 5000,
        });

        this.schedulingClient = axios.create({
            baseURL: cfg.get('SCHEDULING_API', 'http://service-scheduling:3000'),
            timeout: 5000,
        });
    }

    get users() {
        return this.usersClient;
    }

    get scheduling() {
        return this.schedulingClient;
    }
}