import { Entity, PrimaryColumn, Column, CreateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('messages')
export class Message {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('text')
  content: string;

  @Column('varchar', { length: 36 })
  conversationId: string;

  @Column('varchar', { length: 36 })
  senderId: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }
}
