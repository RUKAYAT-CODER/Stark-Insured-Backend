import * as Mixpanel from 'mixpanel';

export const MixpanelProvider = {
  provide: 'MIXPANEL',
  useFactory: () => {
    if (!process.env.MIXPANEL_TOKEN) {
      throw new Error('MIXPANEL_TOKEN not configured');
    }

    return Mixpanel.init(process.env.MIXPANEL_TOKEN);
  },
};