export enum OracleProvider {
  CHAINLINK = 'chainlink',
  PYTH = 'pyth',
  BAND_PROTOCOL = 'band_protocol',
  CUSTOM = 'custom',
}

export enum OracleDataType {
  PRICE = 'price',
  WEATHER = 'weather',
  FLIGHT_STATUS = 'flight_status',
  INSURANCE_EVENT = 'insurance_event',
  CUSTOM = 'custom',
}

export enum OracleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
