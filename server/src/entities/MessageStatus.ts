import { Entity, PrimaryColumn, Column, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('message_statuses')
export class MessageStatus {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  messageId: string;

  @Column('varchar', { length: 36 })
  userId: string;

  @Column({ type: 'enum', enum: ['delivered', 'read'] })
  status: 'delivered' | 'read';

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }
}
