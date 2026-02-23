export interface SecurityPolicy {
  rateLimit: {
    points: number;
    duration: number; // seconds
    blockDuration: number; // seconds
  };
  geoBlocking: {
    enabled: boolean;
    blockedCountries: string[]; // ISO 2-letter codes
  };
  ipReputation: {
    enabled: boolean;
    blockThreshold: number; // 0-100, higher is worse
  };
  waf: {
    enabled: boolean;
    rules: {
      sqli: boolean;
      xss: boolean;
    };
  };
}

export interface IpReputation {
  score: number;
  tags: string[];
  country: string;
}