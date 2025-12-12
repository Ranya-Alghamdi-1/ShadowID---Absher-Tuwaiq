import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Activity } from "./Activity";

@Entity()
export class ShadowId {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  token!: string;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column()
  riskLevel!: string; // 'Low' | 'Medium' | 'High'

  @Column()
  riskScore!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  deviceFingerprint?: string;

  @Column({ nullable: true })
  generationLocation?: string;

  @Column({ default: false })
  isUsed!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.shadowIds)
  user!: User;

  @OneToMany(() => Activity, (activity) => activity.shadowId)
  activities!: Activity[];
}
