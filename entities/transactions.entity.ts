import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Transactions {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  value: number;

  @Column()
  chat_id: number;

  @Column()
  category_id: number;

  @Column({ type: 'timestamptz' })
  created_at: Date;
}
