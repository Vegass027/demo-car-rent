import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, Wallet, FileText, Smartphone, PieChart, RefreshCw,
  Calculator, Layers, Eye, Phone, ClipboardList, Lock, FileCheck,
  IdCard, StickyNote, TrendingUp, Search, BarChart3, Coins, type LucideIcon,
} from 'lucide-react'
import { LandingHeader } from '@/components/landing/Header'
import { LandingFooter } from '@/components/landing/Footer'
import { FeatureBlock } from '@/components/landing/FeatureBlock'

const EASE = [0.23, 1, 0.32, 1] as const

const TRIGGERS = [
  { icon: Wallet, label: 'Деньги под контролем' },
  { icon: FileText, label: 'Договоры в один клик' },
  { icon: Smartphone, label: 'Работает с телефона' },
]

interface BulletProps {
  icon: LucideIcon
  children: React.ReactNode
}

function Bullet({ icon: Icon, children }: BulletProps) {
  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ffdb33]/40 bg-[#ffdb33]/20">
        <Icon className="h-5 w-5 text-[#111]" strokeWidth={1.8} />
      </span>
      <p className="text-center text-[15px] font-medium leading-[1.45] text-[#111] sm:text-[16px] md:text-[17px]">
        {children}
      </p>
    </div>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111]">
      <LandingHeader />

      {/* Placeholder чтобы контент не уходил под fixed хедер */}
      <div className="h-16" />

      {/* HERO */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28">
        {/* Тонкая амбиент-сетка на фоне */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(17,17,17,0.06) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Тёплое пятно */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,219,51,0.18),transparent_70%)]"
        />

        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center md:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="font-head text-[30px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#111] sm:text-[40px] md:text-[64px] lg:text-[76px]"
          >
            Весь автопарк —
            <br className="hidden sm:block" />
            {' '}в одном интерфейсе <span className="inline-block">📱</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
            className="mt-6 max-w-[62ch] text-base leading-[1.55] text-[#2F3437] sm:mt-7 sm:text-lg md:text-xl"
          >
            Собственнику — видно, где прибыль, а где убытки. Не нужно держать в голове,
            кто оплатил и какая машина свободна. Одно приложение вместо блокнота, Excel и памяти.
          </motion.p>

          {/* Триггеры: рамка сверху и снизу всей группы */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
            className="mt-8 flex w-full max-w-xs flex-col items-center gap-3 border-y border-black/[0.12] py-4 sm:mt-10 sm:max-w-2xl sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3"
          >
            {TRIGGERS.map((t) => (
              <span
                key={t.label}
                className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.04em] text-[#2F3437] sm:text-[13px]"
              >
                <t.icon className="h-4 w-4 text-[#F97316]" strokeWidth={1.8} />
                {t.label}
              </span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.28 }}
            className="mt-10 flex flex-col items-center gap-3 sm:mt-12 sm:flex-row"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-[#111] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98] sm:px-7 sm:text-base"
            >
              Открыть демо
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2} />
              </span>
            </Link>
            <a
              href="#dashboard"
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[#111] transition-colors hover:border-black/20 hover:bg-[#F7F6F3] sm:px-6"
            >
              Посмотреть возможности
            </a>
          </motion.div>
        </div>
      </section>

      {/* БЛОКИ */}
      <div className="divide-y-2 divide-black/[0.06] border-t border-b border-black/[0.06]">
        <FeatureBlock
          id="dashboard"
          number={1}
          title="Вся картина бизнеса — с одного взгляда."
          description="Открыл приложение — и через пять секунд понятно, как идут дела в автопарке. Не нужно лезть в таблицы и вспоминать, где что записано."
          imageSrc="/landing/dashboard.png"
          imageAlt="Главный экран — финансовый обзор автопарка"
          imagePosition="right"
          footer={
            <>
              <Bullet icon={PieChart}>Круговая диаграмма расходов — видно, куда уходят деньги: топливо, ТО, штрафы, мойка.</Bullet>
              <Bullet icon={RefreshCw}>Обновляется сама при каждой новой записи, пересчитывать вручную не нужно.</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="cars"
          number={2}
          title="Каждая машина — как на ладони."
          description="Карточка с историей, фото и статусом для каждой машины"
          imageSrc="/landing/car-card.png"
          imageAlt="Карточка машины с историей, фото и статусом"
          imagePosition="left"
          footer={
            <>
              <Bullet icon={Calculator}>Сумма подготовки хранится отдельно и участвует в окупаемости</Bullet>
              <Bullet icon={Layers}>Парк от одной машины до десятков — без ограничений</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="timeline"
          number={3}
          title="Календарь занятости машины."
          description="Месячный календарь показывает когда машина свободна"
          imageSrc="/landing/car-timeline.png"
          imageAlt="Месячный календарь занятости машины"
          imagePosition="right"
          footer={
            <>
              <Bullet icon={Eye}>Сразу видно простаивающие дни без дохода</Bullet>
              <Bullet icon={Phone}>Ответ на звонок «нужна машина на неделю» за секунду</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="records"
          number={4}
          title="Всё, что было за день — на одной странице."
          description="Одна форма вместо отдельных таблиц для доходов, расходов и броней"
          imageSrc="/landing/records-form.png"
          imageAlt="Форма записи: аренда, расходы, бронирования"
          descriptionInCard
          descriptionIcon={ClipboardList}
        />

        <FeatureBlock
          id="buyout"
          number={5}
          title="Выкуп считает себя сам."
          description="Сколько прибыли, сколько возврат стоимости — без блокнота"
          imageSrc="/landing/buyout.png"
          imageAlt="Карточка договора выкупа с историей платежей"
          imagePosition="left"
          footer={
            <>
              <Bullet icon={Lock}>Договор закрывается с возвратом залога и указанием суммы</Bullet>
              <Bullet icon={FileCheck}>Файл договора прикреплён к карточке выкупа</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="clients"
          number={6}
          title="База клиентов, которая помнит всё за вас."
          description="Паспорт, прописка, В/У — всё в одном месте, без дублей"
          imageSrc="/landing/clients.png"
          imageAlt="База клиентов с историей аренд"
          imagePosition="right"
          footer={
            <>
              <Bullet icon={IdCard}>Паспорт и В/У подставляются в договоры автоматически</Bullet>
              <Bullet icon={StickyNote}>Заметка вроде «без предоплаты не выдавать» не потеряется</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="journal"
          number={7}
          title="История автопарка в одной ленте с фильтрами по периодам."
          description="Сдачи, расходы, залоги, платежи по выкупу — всё в одной ленте"
          imageSrc="/landing/journal.png"
          imageAlt="Лента событий с фильтрами по периоду"
          imagePosition="left"
          footer={
            <>
              <Bullet icon={TrendingUp}>Инвестиции не путаются с расходами — только реальная прибыль</Bullet>
              <Bullet icon={Search}>История по спорной ситуации поднимается в два клика</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="analytics"
          number={8}
          title="Аналитика — видно, кто зарабатывает, а кто тянет вниз."
          description="Какая машина реально зарабатывает, а какая съедает деньги"
          imageSrc="/landing/analytics.png"
          imageAlt="Таблица сравнения машин по аналитике"
          imagePosition="right"
          descriptionInCard
          descriptionIcon={BarChart3}
        />

        <FeatureBlock
          id="payback"
          number={9}
          title="Когда машина отобьётся — известно заранее."
          description="Точный ответ по каждой машине и по всему парку"
          imageSrc="/landing/payback.png"
          imageAlt="Окупаемость машин и всего автопарка"
          imagePosition="left"
          footer={
            <>
              <Bullet icon={Coins}>«Вложено» = цена покупки + все траты на подготовку</Bullet>
              <Bullet icon={Layers}>Логика одна — для одной машины и для парка</Bullet>
            </>
          }
        />

        <FeatureBlock
          id="access"
          number={10}
          title="Доступно откуда угодно."
          description="PWA прямо с сайта, без магазина приложений"
          imageSrc="/landing/access.png"
          imageAlt="Доступ с любых устройств — PWA"
          imagePosition="right"
          descriptionInCard
          descriptionIcon={Smartphone}
        />
      </div>

      {/* Финальный CTA */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="font-head text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#111] sm:text-3xl md:text-5xl"
          >
            Посмотрите, как это работает
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-5 max-w-[55ch] text-[15px] leading-[1.6] text-[#2F3437] sm:text-base md:text-lg"
          >
            Демо-вход с готовыми тестовыми данными — машины, клиенты, расходы и выкуп.
            Никакой регистрации, ничего не нужно устанавливать.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="mt-8 md:mt-10"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-[#111] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98] sm:px-8 sm:py-3.5 sm:text-base"
            >
              Открыть демо
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2} />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
