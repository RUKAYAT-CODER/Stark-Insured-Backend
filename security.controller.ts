import { Controller, Get, Put, Body } from '@nestjs/common';
import { SecurityPolicyService } from '../services/security-policy.service';
import { SecurityPolicy } from '../interfaces/security.interface';

@Controller('security')
export class SecurityController {
  constructor(private policyService: SecurityPolicyService) {}

  @Get('policy')
  getPolicy() {
    return this.policyService.getPolicy();
  }

  @Put('policy')
  updatePolicy(@Body() policy: Partial<SecurityPolicy>) {
    this.policyService.updatePolicy(policy);
    return { message: 'Security policy updated', policy: this.policyService.getPolicy() };
  }
}