import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StakesController } from './stakes.controller'
import { StakeEntity } from './entities/stake.entity'
import { CallEntity } from './entities/call.entity'
import { StakesService } from './stakes.service'

@Module({
  imports: [TypeOrmModule.forFeature([StakeEntity, CallEntity])],
  controllers: [StakesController],
  providers: [StakesService],
  exports: [StakesService],
})
export class StakesModule {}