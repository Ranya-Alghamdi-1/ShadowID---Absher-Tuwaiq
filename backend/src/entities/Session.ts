import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from "typeorm";
import { User } from "./User";

@Entity()
@Index(["sessionId"], { unique: true })
@Index(["userId", "isActive"])
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  sessionId!: string; // Express session ID

  @ManyToOne(() => User)
  user!: User;

  @Column()
  userId!: number;

  @Column({ default: true })
  isActive!: boolean; // Can be revoked by setting to false

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  deviceFingerprint?: string; // Link session to device for revocation

  @Column({ nullable: true })
  deviceName?: string; // Device name (e.g., "iPhone", "Chrome")

  @Column({ nullable: true })
  location?: string; // Device location

  @CreateDateColumn()
  createdAt!: Date;
}

