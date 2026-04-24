@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  holderId: string;

  @Column()
  coverageAmount: number;

  @Column()
  premium: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;
}
