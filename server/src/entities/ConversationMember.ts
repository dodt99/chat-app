import { Entity, PrimaryColumn, Column, CreateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  conversationId: string;

  @Column('varchar', { length: 36 })
  userId: string;

  @CreateDateColumn()
  joinedAt: Date;

  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }
}
