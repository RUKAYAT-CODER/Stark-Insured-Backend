"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyHistory = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const insurance_policy_entity_1 = require("./insurance-policy.entity");
const policy_status_enum_1 = require("../enums/policy-status.enum");
let PolicyHistory = class PolicyHistory {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, policyId: { required: true, type: () => String }, policy: { required: true, type: () => require("./insurance-policy.entity").InsurancePolicy }, status: { required: true, enum: require("../enums/policy-status.enum").PolicyStatus }, reason: { required: true, type: () => String }, actorId: { required: true, type: () => String }, createdAt: { required: true, type: () => Date } };
    }
};
exports.PolicyHistory = PolicyHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PolicyHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'policy_id' }),
    __metadata("design:type", String)
], PolicyHistory.prototype, "policyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => insurance_policy_entity_1.InsurancePolicy),
    (0, typeorm_1.JoinColumn)({ name: 'policy_id' }),
    __metadata("design:type", insurance_policy_entity_1.InsurancePolicy)
], PolicyHistory.prototype, "policy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: policy_status_enum_1.PolicyStatus }),
    __metadata("design:type", String)
], PolicyHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PolicyHistory.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', nullable: true }),
    __metadata("design:type", String)
], PolicyHistory.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PolicyHistory.prototype, "createdAt", void 0);
exports.PolicyHistory = PolicyHistory = __decorate([
    (0, typeorm_1.Entity)('policy_history')
], PolicyHistory);
//# sourceMappingURL=policy-history.entity.js.map