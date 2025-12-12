import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Service } from "./Service";

@Entity()
export class ServicePortal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  portalId!: string; // Unique identifier like "MOI-001-RIYADH-01", "AHLI-BANK-001-JEDDAH-01"

  @Column()
  name!: string; // Display name: "وزارة الداخلية - فرع الرياض", "البنك الأهلي - فرع جدة"

  @Column()
  location!: string; // Specific location: "الرياض", "جدة", "الدمام"

  @Column({ nullable: true })
  address?: string; // Full address if needed

  @Column({ nullable: true })
  region?: string; // Region for admin heatmap

  @ManyToOne(() => Service, (service) => service.portals)
  service!: Service;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
