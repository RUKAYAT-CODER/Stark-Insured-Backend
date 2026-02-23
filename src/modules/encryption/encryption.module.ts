import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeyManagementService } from './key-management.service';
import { EncryptionService } from './encryption.service';
import { EncryptionRegistry } from './encryption.registry';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [KeyManagementService, EncryptionService, EncryptionRegistry],
    exports: [KeyManagementService, EncryptionService, EncryptionRegistry],
})
export class EncryptionModule { }
