import * as dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import { Context, Scenes, session, Telegraf } from 'telegraf';

import menu from './scenes/menu.scenes';
import moneyInput from './scenes/money-input.scenes';

dotenv.config();

interface MySession extends Scenes.WizardSession<Scenes.WizardSessionData> {
  // will be available under `ctx.session.mySessionProp`
  mode: string;

  value: number;

  userCategories: string[];

  editCategory: string;
}

interface MyContext extends Context {
  // declare session type
  session: MySession;
  // declare scene type
  scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;
  // declare wizard type
  wizard: Scenes.WizardContextWizard<MyContext>;
}

let connection = null;

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);
// @ts-ignore
const stage = new Scenes.Stage<MyContext>([menu, moneyInput]);
bot.use(session());
bot.use(async (ctx, next) => {
  if (!connection) {
    connection = await createConnection({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      url: process.env.DATABASE_URL,
      entities: ['dist/entities/**/*.js'],
      migrations: ['migration/**/*.ts'],
      cli: {
        migrationsDir: 'migration',
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  next();
});
bot.use(stage.middleware());

bot.command('categories', (ctx) => {
  ctx.scene.enter('super-wizard');
});

bot.hears(/[0-9]*[.[0-9]+]?/, (ctx) => {
  ctx.scene.enter('money-input');
});

bot.launch().then(() => {
  console.info(`Bot ${bot.botInfo.username} is up and running`);
});

// Enable graceful stop
process.once('SIGINT', async () => {
  console.log('SIGINT');
  await connection?.close();

  bot.stop('SIGINT');
});

process.once('SIGTERM', async () => {
  console.log('SIGTERM');
  await connection?.close();

  bot.stop('SIGTERM');
});
