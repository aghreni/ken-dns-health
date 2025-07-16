import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Domain } from "./Domain";

@Entity('dns_check_history')
export class DnsCheckHistory {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    domain_id!: number;

    @Column({ type: 'timestamp' })
    checked_at!: Date;

    @Column({ type: 'boolean' })
    status!: boolean;
}
