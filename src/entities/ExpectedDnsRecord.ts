import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Domain } from "./Domain";

@Entity('expected_dns_records')
export class ExpectedDnsRecord {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    domain_id!: number;

    @Column({ type: 'varchar', length: 10 })
    record_type!: string;

    @Column({ type: 'text' })
    record_value!: string;
}
