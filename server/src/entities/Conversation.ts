import { Entity, PrimaryColumn, Column, CreateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type ConversationType = 'dm' | 'group';

@Entity('conversations')
export class Conversation {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ type: 'enum', enum: ['dm', 'group'] })
  type: ConversationType;

  @Column({ nullable: true, type: 'varchar' })
  name: string | null;

  @Column('varchar', { length: 36 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }
}
