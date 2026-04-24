"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['insurance/entities/*.entity.ts'],
    migrations: ['insurance/migrations/*.ts'],
    synchronize: false,
    logging: ['error', 'warn', 'migration'],
});
//# sourceMappingURL=ormconfig.js.map