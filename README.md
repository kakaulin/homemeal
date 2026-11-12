# Home Meal — MVP 0.1

Калькулятор стоимости и КБЖУ домашних блюд и приёмов пищи.
Ядро продукта: **продукт → блюдо → приём пищи**. Всё считается локально, данные
хранятся в браузере.

## Стек

| Слой | Технология |
| --- | --- |
| Фреймворк | Next.js 15.5 (App Router), React 19, TypeScript strict |
| UI | HeroUI v3 (`@heroui/react` + `@heroui/styles`), без `HeroUIProvider` |
| Стили | Tailwind CSS v4 (CSS-first, без `tailwind.config.js`) |
| Состояние | Zustand + `persist` (`localStorage`, ключ `home-meal-mvp`) |
| Шрифт | Lebowski by Pragmatica, локальные `.woff2`, `next/font/local` |
| Тесты | Vitest (8 тестов расчётов) |

## Запуск

```bash
npm install
npm run dev          # http://localhost:3000
```

Другие команды:

```bash
npm test             # unit-тесты расчётов
npm run typecheck    # tsc --noEmit
npm run build        # production-сборка
npm start            # запуск собранной версии
```

## Структура

```
app/
  layout.tsx           # шрифт, globals.css, оболочка
  page.tsx             # редирект на /products
  fonts.ts             # localFont: 9 начертаний Lebowski
  fonts/Lebowski/      # .woff2 внутри проекта
  globals.css          # @import "tailwindcss" → @import "@heroui/styles"
  products|dishes|meals/page.tsx
components/
  AppShell.tsx         # сайдбар (desktop) + табы (mobile)
  ProductsScreen.tsx   # таблица/карточки, поиск, CRUD
  ProductFormModal.tsx # модальная форма продукта
  DishesScreen.tsx     # карточки блюд с итогами
  DishFormModal.tsx    # конструктор блюда с живыми итогами
  MealsScreen.tsx      # карточки приёмов пищи
  MealFormModal.tsx    # конструктор приёма пищи
  ConfirmDialog.tsx    # подтверждение удаления
  ui/                  # поля ввода, метрики, заголовки, пустые состояния
lib/
  types.ts             # Product, Dish, Meal, DishItem, MealItem
  calc.ts              # чистые функции расчёта
  calc.test.ts         # unit-тесты
  store.ts             # Zustand + persist
  seed.ts              # 39 продуктов, 8 блюд, 1 приём пищи
  format.ts            # русское форматирование чисел
  number.ts            # разбор «1 234,56» из полей ввода
  categories.ts        # справочники категорий и единиц
```

## Расчёты

`calculateDish(dish, products)` суммирует стоимость и КБЖУ состава и делит на
`cookedWeightGrams`, чтобы получить показатели на 100 г готового блюда.
Для `unit = "piece"` пересчёт идёт через `gramsPerPiece`. Если итоговый вес
не задан (`<= 0`), функция возвращает `null` — интерфейс показывает прочерк и
блокирует сохранение.

`calculateMeal(meal, dishes, products)` берёт итоги блюда и умножает на
`portionGrams / dish.cookedWeightGrams`, затем суммирует по всем позициям.
`Meal` ссылается только на `Dish` — продуктов напрямую в приёме пищи нет.

## Данные

Начальное состояние заполняется реалистичными seed-данными (39 продуктов,
8 блюд, 1 приём пищи). Дальше всё живёт в `localStorage` под ключом
`home-meal-mvp`; серверной части, авторизации и внешних API нет.

Удаление продукта убирает его из состава блюд, удаление блюда — из приёмов пищи,
поэтому «висячих» ссылок не остаётся.

## Что не входит в MVP 0.1

Нет 3D, календаря, списка покупок, цен из магазинов, авторизации, БД и API routes.
Расчёт ужарки/уварки моделируется одним полем «итоговый вес готового блюда».

## Шрифт

Lebowski by Pragmatica — правообладатель ООО «Прагматика»
(pragmatica.design/lebowski). Файлы `.woff2` лежат в `app/fonts/Lebowski/`;
лицензия разрешает передачу файлов третьим лицам и размещение в открытом
доступе (п. 2.2.2), оригинальное название шрифта сохранено.

## Примечание про окружение

Локальный `.npmrc` направляет кэш npm в `.npm-cache` внутри проекта: в
изолированной среде сборки глобальный кэш пользователя недоступен для записи.
Файл содержит абсолютные пути этой машины и в репозиторий не попадает — на
обычной машине `npm install` работает со стандартным кэшем.
