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
exports.ClaimHistory = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const claim_entity_1 = require("./claim.entity");
const claim_status_enum_1 = require("../enums/claim-status.enum");
let ClaimHistory = class ClaimHistory {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, claimId: { required: true, type: () => String }, claim: { required: true, type: () => require("./claim.entity").Claim }, status: { required: true, enum: require("../enums/claim-status.enum").ClaimStatus }, reason: { required: true, type: () => String }, actorId: { required: true, type: () => String }, createdAt: { required: true, type: () => Date } };
    }
};
exports.ClaimHistory = ClaimHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ClaimHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'claim_id' }),
    __metadata("design:type", String)
], ClaimHistory.prototype, "claimId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => claim_entity_1.Claim),
    (0, typeorm_1.JoinColumn)({ name: 'claim_id' }),
    __metadata("design:type", claim_entity_1.Claim)
], ClaimHistory.prototype, "claim", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: claim_status_enum_1.ClaimStatus }),
    __metadata("design:type", String)
], ClaimHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ClaimHistory.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', nullable: true }),
    __metadata("design:type", String)
], ClaimHistory.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ClaimHistory.prototype, "createdAt", void 0);
exports.ClaimHistory = ClaimHistory = __decorate([
    (0, typeorm_1.Entity)('claim_history')
], ClaimHistory);
//# sourceMappingURL=claim-history.entity.js.map