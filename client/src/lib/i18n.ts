// Локализация. RU по умолчанию; структура готова к EN/KZ.
// Все строки интерфейса вынесены сюда (статусы/роли приходят из /api/meta).

export type Lang = 'ru' | 'en' | 'kz';

type Dict = Record<string, string>;

const ru: Dict = {
  // Навигация
  'nav.dashboard': 'Дашборд',
  'nav.board': 'Рабочее место',
  'nav.orders': 'Заявки',
  'nav.specifications': 'Спецификации',
  'nav.analytics': 'Аналитика',
  'nav.inventory': 'Остатки',
  'nav.calendar': 'Календарь',
  'nav.clients': 'Клиенты',
  'nav.users': 'Пользователи',
  'nav.refs': 'Справочники',
  'nav.settings': 'Настройки',
  'nav.production': 'План производства',
  'nav.profile': 'Профиль',
  'nav.logout': 'Выйти',
  'nav.createOrder': 'Создать заявку',
  'nav.myOrders': 'Мои заявки',

  // Общее
  'common.refresh': 'Обновить',
  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',
  'common.create': 'Создать',
  'common.add': 'Добавить',
  'common.delete': 'Удалить',
  'common.edit': 'Изменить',
  'common.close': 'Закрыть',
  'common.search': 'Поиск',
  'common.all': 'Все',
  'common.empty': 'Пусто',
  'common.loading': 'Загрузка…',
  'common.total': 'Всего',
  'common.inWork': 'В работе',
  'common.delivered': 'Доставлено',
  'common.rejected': 'Отклонено',
  'common.priority': 'Приоритет',
  'common.factory': 'Завод',
  'common.carrier': 'Перевозчик',
  'common.client': 'Клиент',
  'common.manager': 'Менеджер',
  'common.status': 'Статус',
  'common.date': 'Дата',
  'common.actions': 'Действия',
  'common.upload': 'Загрузить',
  'common.download': 'Скачать',
  'common.sign': 'Подписать',
  'common.history': 'История',
  'common.documents': 'Документы',
  'common.route': 'Маршрут',
  'common.volume': 'Объём',
  'common.amount': 'Сумма',

  // Авторизация
  'auth.login': 'Вход',
  'auth.register': 'Регистрация',
  'auth.email': 'Email',
  'auth.password': 'Пароль',
  'auth.signIn': 'Войти',
  'auth.signUp': 'Зарегистрироваться',
  'auth.forgot': 'Забыли пароль?',
  'auth.noAccount': 'Нет аккаунта?',
  'auth.haveAccount': 'Уже есть аккаунт?',
  'auth.clientRegister': 'Регистрация клиента',
};

const dicts: Record<Lang, Dict> = { ru, en: {}, kz: {} };

let lang: Lang = 'ru';

export function setLang(l: Lang): void {
  lang = l;
  localStorage.setItem('crm_lang', l);
}
export function getLang(): Lang {
  return (localStorage.getItem('crm_lang') as Lang) || lang;
}

export function t(key: string): string {
  const l = getLang();
  return dicts[l]?.[key] ?? ru[key] ?? key;
}
