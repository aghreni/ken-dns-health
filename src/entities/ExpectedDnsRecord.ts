import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
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
