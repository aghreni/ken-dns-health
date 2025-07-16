import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
@Entity('retrieved_dns_records')
export class RetrievedDnsRecord {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    //check_id is used to link this record to a specific DNS check history
    check_id!: number;

    @Column({ type: 'int' })
    domain_id!: number;

    @Column({ type: 'varchar', length: 10 })
    record_type!: string;

    @Column({ type: 'text' })
    record_value!: string;
}
