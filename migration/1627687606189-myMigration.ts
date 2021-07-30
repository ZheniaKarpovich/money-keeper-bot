import { MigrationInterface, QueryRunner } from 'typeorm';

export class myMigration1627687606189 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
create table categories
                                 (
                                     id      serial  not null
                                         constraint categories_pk
                                             primary key,
                                     name    text    not null,
                                     chat_id integer not null
                                 );

        alter table categories
            owner to postgres;

        create unique index categories_id_uindex
    on categories (id);

        create table transactions
        (
            id          serial                  not null
                constraint transactions_pk
                    primary key,
            value       double precision        not null,
            chat_id     integer                 not null,
            category_id integer                 not null
                constraint transactions_category_id_fk
                    references categories,
            created_at  timestamp default now() not null
        );

        alter table transactions
            owner to postgres;

        create unique index transactions_id_uindex
    on transactions (id);
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
