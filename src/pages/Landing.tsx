import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Wallet, FileText, Smartphone } from 'lucide-react'
import { LandingHeader } from '@/components/landing/Header'
import { LandingFooter } from '@/components/landing/Footer'
import { FeatureBlock } from '@/components/landing/FeatureBlock'

const EASE = [0.23, 1, 0.32, 1] as const

const TRIGGERS = [
  { icon: Wallet, label: 'Деньги под контролем' },
  { icon: FileText, label: 'Договоры в один клик' },
  { icon: Smartphone, label: 'Работает с телефона' },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111]">
      <LandingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
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
            className="font-head text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#111] md:text-[64px] lg:text-[76px]"
          >
            Весь автопарк — <br className="hidden sm:block" />
            в одном интерфейсе <span className="inline-block">📱</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
            className="mt-7 max-w-[62ch] text-lg leading-[1.55] text-[#2F3437] md:text-xl"
          >
            Собственнику — видно, где прибыль, а где убытки. Не нужно держать в голове,
            кто оплатил и какая машина свободна. Одно приложение вместо блокнота, Excel и памяти.
          </motion.p>

          {/* Триггеры */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            {TRIGGERS.map((t) => (
              <span
                key={t.label}
                className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.04em] text-[#2F3437]"
              >
                <t.icon className="h-4 w-4 text-[#111]" strokeWidth={1.6} />
                {t.label}
              </span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.28 }}
            className="mt-12 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-[#111] px-7 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98]"
            >
              Открыть демо
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2} />
              </span>
            </Link>
            <a
              href="#dashboard"
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium text-[#111] transition-colors hover:border-black/20 hover:bg-[#F7F6F3]"
            >
              Посмотреть возможности
            </a>
          </motion.div>
        </div>
      </section>

      {/* БЛОКИ */}
      <div className="divide-y divide-black/[0.04]">
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
              <p>• Круговая диаграмма расходов — видно, куда уходят деньги: топливо, ТО, штрафы, мойка.</p>
              <p>• Обновляется сама при каждой новой записи, пересчитывать вручную не нужно.</p>
            </>
          }
        />

        <FeatureBlock
          id="cars"
          number={2}
          title="Каждая машина — как на ладони."
          description="Каждая машина — это полноценная карточка с историей, фото и текущим статусом. Меняется в один клик прямо на странице."
          imageSrc="/landing/car-card.png"
          imageAlt="Карточка машины с историей, фото и статусом"
          imagePosition="left"
          footer={
            <>
              <p>• Сумма, вложенная в подготовку (страховка, шины, мелкий ремонт), хранится отдельно и участвует в расчёте окупаемости.</p>
              <p>• Парк может быть любого размера — от одной машины до десятков.</p>
            </>
          }
        />

        <FeatureBlock
          id="timeline"
          number={3}
          title="Календарь занятости машины."
          description="На странице машины — календарь на месяц, который отвечает на вопрос «когда она свободна» быстрее, чем память или блокнот."
          imageSrc="/landing/car-timeline.png"
          imageAlt="Месячный календарь занятости машины"
          imagePosition="right"
          footer={
            <>
              <p>• Сразу видно простаивающие дни — те, что не приносят денег.</p>
              <p>• На звонок «нужна машина на неделю» ответ готов за секунду, без сверки записей с менеджером.</p>
            </>
          }
        />

        <FeatureBlock
          id="records"
          number={4}
          title="Всё, что было за день — на одной странице."
          description="Всё, что происходит с машиной за день, вносится в одну форму — не нужно вести отдельные таблицы для доходов, расходов и броней."
          imageSrc="/landing/records-form.png"
          imageAlt="Форма записи: аренда, расходы, бронирования"
          descriptionInCard
        />

        <FeatureBlock
          id="buyout"
          number={5}
          title="Выкуп считает себя сам."
          description="Выкуп — это обычно десятки цифр в голове: сколько уже заплачено, сколько из этого прибыль, а сколько — возврат стоимости машины. Здесь всё считается само."
          imageSrc="/landing/buyout.png"
          imageAlt="Карточка договора выкупа с историей платежей"
          imagePosition="left"
          footer={
            <>
              <p>• Договор закрывается с возвратом залога и указанием суммы — выкуплен или отменён.</p>
              <p>• Файл с договором прикреплён к карточке выкупа.</p>
            </>
          }
        />

        <FeatureBlock
          id="clients"
          number={6}
          title="База клиентов, которая помнит всё за вас."
          description="ФИО, паспорт, прописка, водительское удостоверение — всё в одном месте. Система сама найдёт существующего клиента и не даст создать дубль."
          imageSrc="/landing/clients.png"
          imageAlt="База клиентов с историей аренд"
          imagePosition="right"
          footer={
            <>
              <p>• Паспорт, прописка, водительское удостоверение хранятся в карточке и сами подставляются в договоры.</p>
              <p>• Комментарий к клиенту — заметка вроде «не выдавать без предоплаты» не потеряется.</p>
            </>
          }
        />

        <FeatureBlock
          id="journal"
          number={7}
          title="Вся история автопарка в одной ленте с фильтрами по периодам."
          description="Все события: сдачи, расходы, залоги, платежи по выкупу — в одной ленте с быстрым выбором периода: сегодня, неделя, месяц или произвольный диапазон."
          imageSrc="/landing/journal.png"
          imageAlt="Лента событий с фильтрами по периоду"
          imagePosition="left"
          footer={
            <>
              <p>• Инвестиции (страховка, шины) не путаются с ежедневными расходами — в итоге только реальная операционная прибыль.</p>
              <p>• Удобно поднять историю по спорной ситуации — что и когда произошло с конкретной машиной.</p>
            </>
          }
        />

        <FeatureBlock
          id="analytics"
          number={8}
          title="Аналитика — видно, кто зарабатывает, а кто тянет вниз."
          description="Не всегда очевидно, какая машина реально зарабатывает, а какая «съедает» деньги на ремонте. Таблица сравнения показывает это без раскопок в отчётах."
          imageSrc="/landing/analytics.png"
          imageAlt="Таблица сравнения машин по аналитике"
          imagePosition="right"
          descriptionInCard
        />

        <FeatureBlock
          id="payback"
          number={9}
          title="Когда машина отобьётся — известно заранее."
          description="«Когда эта машина уже отобьётся?» — вопрос, на который обычно нет точного ответа без подсчётов в блокноте. Здесь ответ есть всегда — по каждой машине и по всему парку."
          imageSrc="/landing/payback.png"
          imageAlt="Окупаемость машин и всего автопарка"
          imagePosition="left"
          footer={
            <>
              <p>• В сумму «вложено» входит и цена покупки, и все траты на подготовку.</p>
              <p>• Одна и та же логика работает и для одной машины, и для парка целиком.</p>
            </>
          }
        />

        <FeatureBlock
          id="access"
          number={10}
          title="Доступно откуда угодно."
          description="Приложение устанавливается как PWA — прямо на телефон с сайта, без магазина приложений. Работает офлайн, адаптируется под любой экран — от телефона до компьютера."
          imageSrc="/landing/access.png"
          imageAlt="Доступ с любых устройств — PWA"
          imagePosition="right"
          descriptionInCard
        />
      </div>

      {/* Финальный CTA */}
      <section className="px-4 py-20 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="font-head text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111] md:text-5xl"
          >
            Посмотрите, как это работает
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-5 max-w-[55ch] text-base leading-[1.6] text-[#2F3437] md:text-lg"
          >
            Демо-вход с готовыми тестовыми данными — машины, клиенты, расходы и выкуп.
            Никакой регистрации, ничего не нужно устанавливать.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="mt-10"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-[#111] px-8 py-3.5 text-base font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98]"
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
