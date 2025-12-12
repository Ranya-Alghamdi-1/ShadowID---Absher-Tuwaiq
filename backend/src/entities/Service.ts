import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ServicePortal } from "./ServicePortal";

@Entity()
export class Service {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  serviceId!: string; // Unique identifier like "MOI-001", "AHLI-BANK-001"

  @Column()
  name!: string; // Display name: "وزارة الداخلية", "البنك الأهلي"

  @Column()
  nameEn!: string; // English name for API usage

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column()
  apiKey!: string; // Secret key for authentication

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  requiresUserData!: boolean; // Whether this service can access user info

  @OneToMany(() => ServicePortal, (portal) => portal.service)
  portals!: ServicePortal[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
