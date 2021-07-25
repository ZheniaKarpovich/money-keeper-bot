import { getConnection, getManager, Connection, getRepository } from 'typeorm';
import { Categories } from '../entities/categories.entity';

import { Composer, Context, Markup, Scenes } from 'telegraf';

const backButton = [Markup.button.callback('➡️ back', 'back')];
const defaultKeyboards = [
  Markup.button.callback('🖍️Add', 'add'),
  Markup.button.callback('➕ Edit', 'edit'),
  Markup.button.callback('❌ Delete', 'delete'),
  Markup.button.callback('➡️ Exit', 'exit'),
];

interface MySession extends Scenes.WizardSession<Scenes.WizardSessionData> {
  // will be available under `ctx.session.mySessionProp`
  mode: string;

  value: number;

  userCategories: string[];

  editCategory: string;
}

interface MyContext extends Context {
  session: MySession;

  scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;

  wizard: Scenes.WizardContextWizard<MyContext>;
}

const stepHandler = new Composer<MyContext>();

stepHandler.action('exit', async (ctx) => {
  await ctx.reply('Вы зыкончили ввод категорий.');

  return await ctx.scene.leave();
});

stepHandler.action('back', async (ctx) => {
  ctx.session.mode ??= '';
  ctx.session.editCategory ??= '';

  await ctx.editMessageText('Введите категорию расходов');
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [defaultKeyboards],
  });
});

stepHandler.action(/delete_categories_[\wА-Яа-я]+/, async (ctx) => {
  const tmp = ctx.match.input.split('_');
  const category = tmp[tmp.length - 1];

  await getRepository(Categories).delete({
    chat_id: ctx.update.callback_query.from.id,
    name: category,
  });

  const categories = await getRepository(Categories).find({
    chat_id: ctx.update.callback_query.from.id,
  });

  const keyboards = categories.map(({ name }) => {
    return [Markup.button.callback(name, `delete_categories_${name}`)];
  });

  await ctx.editMessageText(
    `Категория ${category} удалена. Выберете следующую категория для удаления:`,
  );
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [...keyboards, backButton],
  });
});

stepHandler.action(/edit_categories_[\wА-Яа-я]+/, async (ctx) => {
  const tmp = ctx.match.input.split('_');
  const category = tmp[tmp.length - 1];

  ctx.session.mode ??= 'edit';
  ctx.session.editCategory ??= category;

  await ctx.editMessageText(
    `Введите новое название для категории ${category}:`,
  );
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [backButton],
  });
});

stepHandler.action('edit', async (ctx) => {
  const categories = await getRepository(Categories).find({
    chat_id: ctx.update.callback_query.from.id,
  });

  const keyboards = categories.map(({ name }) => {
    return [Markup.button.callback(name, `edit_categories_${name}`)];
  });

  await ctx.editMessageText('Выберите категорию:');
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [...keyboards, backButton],
  });
});

stepHandler.action('add', async (ctx) => {
  ctx.session.mode = 'add';

  await ctx.editMessageText('Ведите категорию:');
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [backButton],
  });
});

stepHandler.action('delete', async (ctx) => {
  const categories = await getRepository(Categories).find({
    chat_id: ctx.update.callback_query.from.id,
  });

  const keyboards = categories.map(({ name }) => {
    return [Markup.button.callback(name, `delete_categories_${name}`)];
  });

  await ctx.editMessageText('Выберите категорию:');
  await ctx.editMessageReplyMarkup({
    inline_keyboard: keyboards,
  });
});

stepHandler.on('text', async (ctx) => {
  try {
    const { mode, editCategory } = ctx.session;

    if (mode === 'edit' && editCategory) {
      await getConnection()
        .createQueryBuilder()
        .update(Categories)
        .set({ name: ctx.message.text })
        .where('name = :name AND chat_id = :chat_id', {
          name: editCategory,
          chat_id: ctx.message.from.id,
        })
        .execute();

      ctx.session.mode = '';
      ctx.session.editCategory = '';
    }

    if (mode === 'add') {
      await getRepository(Categories).save({
        name: ctx.message.text,
        chat_id: ctx.message.from.id,
      });

      ctx.session.mode = '';
      ctx.session.editCategory = '';
    }

    await ctx.reply(
      `Добавлена категория: ${ctx.message.text}`,
      Markup.inlineKeyboard([backButton]),
    );
  } catch (e) {
    console.log(e);

    await ctx.reply('Категория не добавлена!');
  }
});
stepHandler.use((ctx) =>
  ctx.reply(
    'Введите категорию расходов',
    Markup.inlineKeyboard(defaultKeyboards),
  ),
);

const menu = new Scenes.WizardScene(
  'super-wizard',
  async (ctx) => {
    await ctx.reply(
      'Введите категорию расходов',
      Markup.inlineKeyboard(defaultKeyboards),
    );

    return ctx.wizard.next();
  },
  stepHandler,
);

export default menu;
