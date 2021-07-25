import { getRepository } from 'typeorm';
import { Categories } from '../entities/categories.entity';
import { Transactions } from '../entities/transactions.entity';
import { Composer, Context, Markup, Scenes } from 'telegraf';

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

const stepHandler = new Composer<MyContext>();

const matcher = (text, ctx) => {
  if (ctx.session.userCategories) {
    return ctx.session.userCategories.find((cat) => cat === text);
  }

  return false;
};

// @ts-ignore
stepHandler.hears(matcher, async (ctx) => {
  try {
    if (ctx.session.value) {
      // @ts-ignore
      const category = await getRepository(Categories).findOne({
        chat_id: ctx.message.from.id,
        name: ctx.match,
      });

      await getRepository(Transactions).save({
        value: ctx.session.value,
        chat_id: ctx.message.from.id,
        category_id: category.id,
      });

      ctx.session.value = null;
    } else {
      throw new Error('incorrect value');
    }
  } catch (e) {
    console.error(e);
  }

  await ctx.reply('Транзакция записана 👌');

  return ctx.scene.leave();
});

stepHandler.use(async (ctx) => {
  const categories = await getRepository(Categories).find({
    chat_id: ctx.message.from.id,
  });

  const keyboards = categories.map(({ name }) => {
    return [name];
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ctx.session.value = parseFloat(ctx.message.text);
  ctx.session.userCategories = categories.map(({ name }) => {
    return name;
  });

  await ctx.reply(
    'Выберете категорию',
    Markup.keyboard(keyboards).oneTime().resize(),
  );
});

const moneyInput = new Scenes.WizardScene('money-input', stepHandler);

export default moneyInput;
