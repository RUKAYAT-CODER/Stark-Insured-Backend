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
var ClaimService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimService = void 0;
const common_1 = require("@nestjs/common");
const claim_entity_1 = require("./entities/claim.entity");
const claim_history_entity_1 = require("./entities/claim-history.entity");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const claim_status_enum_1 = require("./enums/claim-status.enum");
const event_emitter_1 = require("@nestjs/event-emitter");
let ClaimService = ClaimService_1 = class ClaimService {
    constructor(repo, historyRepo, eventEmitter, dataSource) {
        this.repo = repo;
        this.historyRepo = historyRepo;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(ClaimService_1.name);
    }
    async createHistory(claimId, status, reason, actorId) {
        const history = this.historyRepo.create({
            claimId,
            status,
            reason,
            actorId,
        });
        return this.historyRepo.save(history);
    }
    async updateStatus(claimId, status, reason, actorId) {
        return this.dataSource.transaction(async (manager) => {
            const claim = await manager.findOne(claim_entity_1.Claim, { where: { id: claimId } });
            if (!claim)
                throw new Error('Claim not found');
            const oldStatus = claim.status;
            claim.status = status;
            const updatedClaim = await manager.save(claim);
            const history = manager.create(claim_history_entity_1.ClaimHistory, {
                claimId,
                status,
                reason,
                actorId,
            });
            await manager.save(history);
            this.eventEmitter.emit('claim.status_changed', {
                claimId,
                oldStatus,
                newStatus: status,
                reason,
                actorId,
            });
            return updatedClaim;
        });
    }
    async assessClaim(claimId) {
        return this.updateStatus(claimId, claim_status_enum_1.ClaimStatus.APPROVED, 'Automated assessment approved', 'system');
    }
    async payClaim(claimId) {
        return this.updateStatus(claimId, claim_status_enum_1.ClaimStatus.PAID, 'Payout processed', 'system');
    }
};
exports.ClaimService = ClaimService;
exports.ClaimService = ClaimService = ClaimService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(claim_entity_1.Claim)),
    __param(1, (0, typeorm_2.InjectRepository)(claim_history_entity_1.ClaimHistory)),
    __param(3, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository,
        event_emitter_1.EventEmitter2,
        typeorm_1.DataSource])
], ClaimService);
//# sourceMappingURL=claim.service.js.map