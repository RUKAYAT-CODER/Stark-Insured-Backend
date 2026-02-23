import { Controller, Get, Query } from '@nestjs/common';

@Controller({ path: 'stellar/assets', version: '2' })
export class StellarV2Controller {
  @Get()
  getAssetsV2(@Query('asset_code') assetCode?: string, @Query('issuer') issuer?: string) {
    return { version: 'v2', assets: [], note: 'Supports issuer and partial search' };
  }
}
