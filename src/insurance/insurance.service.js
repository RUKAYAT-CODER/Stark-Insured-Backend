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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InsuranceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceService = void 0;
const common_1 = require("@nestjs/common");
const pricing_service_1 = require("./pricing.service");
const pool_service_1 = require("./pool.service");
const insurance_policy_entity_1 = require("./entities/insurance-policy.entity");
const policy_history_entity_1 = require("./entities/policy-history.entity");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const policy_status_enum_1 = require("./enums/policy-status.enum");
const event_emitter_1 = require("@nestjs/event-emitter");
let InsuranceService = InsuranceService_1 = class InsuranceService {
    constructor(pricing, pools, repo, historyRepo, eventEmitter, dataSource) {
        this.pricing = pricing;
        this.pools = pools;
        this.repo = repo;
        this.historyRepo = historyRepo;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(InsuranceService_1.name);
    }
    async createHistory(policyId, status, reason, actorId) {
        const history = this.historyRepo.create({
            policyId,
            status,
            reason,
            actorId,
        });
        return this.historyRepo.save(history);
    }
    async updateStatus(policyId, status, reason, actorId) {
        return this.dataSource.transaction(async (manager) => {
            const policy = await manager.findOne(insurance_policy_entity_1.InsurancePolicy, { where: { id: policyId } });
            if (!policy)
                throw new Error('Policy not found');
            const oldStatus = policy.status;
            policy.status = status;
            const updatedPolicy = await manager.save(policy);
            const history = manager.create(policy_history_entity_1.PolicyHistory, {
                policyId,
                status,
                reason,
                actorId,
            });
            await manager.save(history);
            this.eventEmitter.emit('policy.status_changed', {
                policyId,
                oldStatus,
                newStatus: status,
                reason,
                actorId,
            });
            return updatedPolicy;
        });
    }
    async purchasePolicy(userId, poolId, riskType, coverageAmount) {
        const premium = this.pricing.calculatePremium(riskType, coverageAmount);
        await this.pools.lockCapital(poolId, coverageAmount);
        const policy = this.repo.create({
            userId,
            poolId,
            riskType,
            coverageAmount,
            premium,
            status: policy_status_enum_1.PolicyStatus.PENDING
        });
        const savedPolicy = await this.repo.save(policy);
        await this.createHistory(savedPolicy.id, policy_status_enum_1.PolicyStatus.PENDING, 'Policy created via purchase', userId);
        this.eventEmitter.emit('policy.created', { policyId: savedPolicy.id, userId });
        return savedPolicy;
    }
};
exports.InsuranceService = InsuranceService;
exports.InsuranceService = InsuranceService = InsuranceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_2.InjectRepository)(insurance_policy_entity_1.InsurancePolicy)),
    __param(3, (0, typeorm_2.InjectRepository)(policy_history_entity_1.PolicyHistory)),
    __param(5, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [pricing_service_1.PricingService,
        pool_service_1.PoolService,
        typeorm_1.Repository,
        typeorm_1.Repository,
        event_emitter_1.EventEmitter2,
        typeorm_1.DataSource])
], InsuranceService);
//# sourceMappingURL=insurance.service.js.map