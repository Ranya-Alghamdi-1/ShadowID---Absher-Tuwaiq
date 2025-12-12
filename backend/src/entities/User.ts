import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from "typeorm";
import { ShadowId } from "./ShadowId";
import { Device } from "./Device";
import { UserSetting } from "./UserSetting";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  nationalId!: string;

  @Column()
  phone!: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true, default: "Citizen" })
  personType?: string; // "Citizen" or "Resident"

  @Column({ nullable: true, default: "Saudi" })
  nationality?: string; // "Saudi", "Egyptian", "Filipino", etc.

  @Column({ type: "datetime", nullable: true })
  lastLoginAt?: Date;

  @Column({ default: 0 })
  totalIdsGenerated: number = 0;

  @Column({ default: 0 })
  totalVerified: number = 0;

  @Column({ default: 0 })
  activeDays: number = 0;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ShadowId, (shadowId) => shadowId.user)
  shadowIds!: ShadowId[];

  @OneToMany(() => Device, (device) => device.user)
  devices!: Device[];

  @OneToMany(() => UserSetting, (setting) => setting.user)
  settings!: UserSetting[];
}
