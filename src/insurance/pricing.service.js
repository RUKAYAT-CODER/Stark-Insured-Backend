"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const risk_type_enum_1 = require("./enums/risk-type.enum");
let PricingService = class PricingService {
    calculatePremium(riskType, coverageAmount) {
        const baseRates = {
            [risk_type_enum_1.RiskType.PROJECT_FAILURE]: 0.05,
            [risk_type_enum_1.RiskType.SMART_CONTRACT_EXPLOIT]: 0.08,
            [risk_type_enum_1.RiskType.MARKET_VOLATILITY]: 0.03,
        };
        return coverageAmount * baseRates[riskType];
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)()
], PricingService);
//# sourceMappingURL=pricing.service.js.map