import { Controller, Get, Query } from '@nestjs/common';

@Controller({ path: 'stellar/assets', version: '1' })
export class StellarV1Controller {
  @Get()
  getAssetsV1(@Query('asset_code') assetCode?: string) {
    return { version: 'v1', assets: [], note: 'Basic asset discovery' };
  }
}
