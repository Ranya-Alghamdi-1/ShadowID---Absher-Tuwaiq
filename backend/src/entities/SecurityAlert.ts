import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { ShadowId } from "./ShadowId";

export enum AlertType {
  MULTIPLE_IDENTITIES = "multiple_identities",
  IMPOSSIBLE_TRAVEL = "impossible_travel",
  DEVICE_HOPPING = "device_hopping",
  FREQUENT_GENERATION = "frequent_generation",
  HIGH_RISK_SCAN = "high_risk_scan",
  TOKEN_REUSE = "token_reuse",
}

export enum AlertSeverity {
  LOW = "منخفض",
  MEDIUM = "متوسط",
  HIGH = "عالي",
  CRITICAL = "حرج",
}

@Entity("security_alerts")
@Index(["type", "isResolved"])
@Index(["severity", "isResolved"])
@Index(["createdAt"])
export class SecurityAlert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "varchar",
    length: 50,
  })
  type!: AlertType;

  @Column({
    type: "varchar",
    length: 20,
  })
  severity!: AlertSeverity;

  @Column({
    type: "text",
    nullable: true,
  })
  title!: string;

  @Column({
    type: "text",
    nullable: true,
  })
  description!: string;

  @ManyToOne(() => User, { nullable: true })
  user!: User | null;

  @ManyToOne(() => ShadowId, { nullable: true })
  shadowId!: ShadowId | null;

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
  })
  location!: string | null;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
  })
  region!: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  metadata!: string | null; // JSON string for additional data

  @Column({
    type: "boolean",
    default: false,
  })
  isResolved!: boolean;

  @Column({
    type: "datetime",
    nullable: true,
  })
  resolvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
