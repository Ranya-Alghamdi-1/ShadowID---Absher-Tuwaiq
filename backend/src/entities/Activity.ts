import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ShadowId } from "./ShadowId";

@Entity()
export class Activity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string; // 'generated' | 'used' | 'expired'

  @Column()
  service!: string; // 'وزارة الداخلية', 'البنك الأهلي', etc.

  @Column()
  location!: string;

  @Column({ type: "datetime" })
  timestamp!: Date;

  @Column()
  blockchainHash!: string;

  @Column()
  status!: string; // 'verified' | 'rejected' | 'pending'

  @Column({ nullable: true })
  region?: string; // For admin heatmap

  @ManyToOne(() => ShadowId, (shadowId) => shadowId.activities, {
    nullable: true,
  })
  shadowId?: ShadowId;
}
