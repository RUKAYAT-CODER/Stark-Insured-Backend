import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Controller('notifications')
export class NotificationController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    @Get('settings/:userId')
    async getSettings(@Param('userId') userId: string) {
        return this.prisma.notificationSetting.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });
    }

    @Put('settings/:userId')
    async updateSettings(
        @Param('userId') userId: string,
        @Body() settings: {
            emailEnabled?: boolean;
            pushEnabled?: boolean;
            notifyContributions?: boolean;
            notifyMilestones?: boolean;
            notifyDeadlines?: boolean;
        },
    ) {
        return this.prisma.notificationSetting.upsert({
            where: { userId },
            update: settings,
            create: {
                userId,
                ...settings,
            },
        });
    }

    @Post('subscribe/:userId')
    async subscribeToPush(
        @Param('userId') userId: string,
        @Body() subscription: any,
    ) {
        // Encrypt push subscription before storing
        const encryptedSubscription = this.encryption.encrypt(JSON.stringify(subscription));
        await this.prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: encryptedSubscription },
        });
        return { success: true };
    }
}
