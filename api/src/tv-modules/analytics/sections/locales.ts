import type { LocalizedText } from 'taskview-api'

export type SectionLocale = {
  title: LocalizedText
  description?: LocalizedText
  help?: {
    summary: LocalizedText
    details: LocalizedText
  }
  datasets?: Record<string, LocalizedText>
  xAxisLabel?: LocalizedText
  yAxisLabel?: LocalizedText
}

const join = (parts: string[]) => parts.join('\n')

export const sectionLocales = {
  // ===== KPI =====

  'kpi.created_tasks': {
    title: { ru: 'Создано задач', en: 'Created tasks' },
    help: {
      summary: {
        ru: 'Количество созданных задач за выбранный период',
        en: 'Number of tasks created in the selected period',
      },
      details: {
        ru: 'Показывает входящий поток работы. Сравните со счётчиком «Закрыто задач» — если создаётся больше, чем закрывается, команда не успевает справляться, и бэклог растёт. Delta показывает изменение относительно предыдущего периода той же длины.',
        en: 'Shows incoming work volume. Compare against "Completed tasks" — if creation outpaces completion, the backlog is growing and the team is falling behind. The delta compares against the equivalent previous period.',
      },
    },
  },

  'kpi.completed_tasks': {
    title: { ru: 'Закрыто задач', en: 'Completed tasks' },
    help: {
      summary: {
        ru: 'Количество задач, закрытых за период',
        en: 'Tasks completed in the selected period',
      },
      details: {
        ru: 'Реальный выход команды — сколько работы было доведено до конца. Сопоставляйте с «Создано задач»: если создано ≫ закрыто, нарастает бэклог. Стабильный тренд роста = хороший признак ускорения процессов.',
        en: 'Actual team output — how much work got finished. Compare with "Created tasks": if creation far exceeds completion, the backlog is growing. A steady upward trend indicates process acceleration.',
      },
    },
  },

  'kpi.overdue': {
    title: { ru: 'Просрочено', en: 'Overdue' },
    help: {
      summary: {
        ru: 'Открытые задачи с прошедшим дедлайном',
        en: 'Open tasks past their due date',
      },
      details: {
        ru: 'Работа, требующая срочного внимания. Если число стабильно растёт — команда перегружена или дедлайны нереалистичны. Кликните по KPI, чтобы увидеть конкретные просроченные задачи.',
        en: 'Work that needs immediate attention. A steadily growing number signals team overload or unrealistic deadlines. Click the KPI to drill into the specific overdue tasks.',
      },
    },
  },

  'kpi.cycle_time': {
    title: { ru: 'Cycle time (медиана)', en: 'Cycle time (median)' },
    description: { ru: 'Медианное время от создания до завершения', en: 'Median time from creation to completion' },
    help: {
      summary: {
        ru: 'Медианное время от создания задачи до её закрытия',
        en: 'Median time from task creation to completion',
      },
      details: {
        ru: 'Сколько в среднем живёт задача с момента создания до закрытия. Рост показателя = замедление процессов. Используется медиана, а не среднее — выбросы (застрявшие задачи) не искажают картину.',
        en: "How long a task typically lives from creation to completion. A rising number means slowing processes. We use the median rather than the mean so that outliers (stuck tasks) don't distort the picture.",
      },
    },
  },

  'kpi.total_income': {
    title: { ru: 'Доходы', en: 'Income' },
    description: { ru: 'Сумма за период', en: 'Sum for period' },
    help: {
      summary: {
        ru: 'Сумма всех доходов за выбранный период',
        en: 'Total income for the selected period',
      },
      details: {
        ru: 'Складываются суммы по закрытым задачам, у которых отмечен тип «доход». Сравнение — с предыдущим периодом такой же длины. Зелёная стрелка вверх — доход вырос, это хорошо.',
        en: 'Sum of amounts on closed tasks marked as "income". Compared against the previous equivalent period. A green up arrow means income grew, which is good.',
      },
    },
  },

  'kpi.total_expense': {
    title: { ru: 'Расходы', en: 'Expense' },
    description: { ru: 'Сумма за период', en: 'Sum for period' },
    help: {
      summary: {
        ru: 'Сумма всех расходов за выбранный период',
        en: 'Total expenses for the selected period',
      },
      details: {
        ru: 'Складываются суммы по закрытым задачам, у которых отмечен тип «расход». Сравнение — с предыдущим периодом такой же длины. Зелёная стрелка вниз — расходы снизились, это хорошо.',
        en: 'Sum of amounts on closed tasks marked as "expense". Compared against the previous equivalent period. A green down arrow means expenses dropped, which is good.',
      },
    },
  },

  'kpi.planned_income': {
    title: { ru: 'Планируемые доходы', en: 'Planned income' },
    description: { ru: 'По открытым задачам', en: 'From open tasks' },
    help: {
      summary: {
        ru: 'Сумма доходов по открытым задачам с указанной суммой',
        en: 'Sum of income from open tasks with amount set',
      },
      details: {
        ru: 'Складываются суммы по всем открытым (не завершённым) задачам с типом «доход» и заполненной суммой. Это снимок ожидаемых поступлений — пока задача не закрыта, доход считается планируемым. Не зависит от выбранного периода.',
        en: 'Sum of amounts from all open (incomplete) tasks marked as "income" with a filled amount. This is a snapshot of expected income — until a task is closed, the income is planned. Not affected by the selected period.',
      },
    },
  },

  'kpi.planned_expense': {
    title: { ru: 'Планируемые расходы', en: 'Planned expense' },
    description: { ru: 'По открытым задачам', en: 'From open tasks' },
    help: {
      summary: {
        ru: 'Сумма расходов по открытым задачам с указанной суммой',
        en: 'Sum of expenses from open tasks with amount set',
      },
      details: {
        ru: 'Складываются суммы по всем открытым (не завершённым) задачам с типом «расход» и заполненной суммой. Это снимок ожидаемых трат — пока задача не закрыта, расход считается планируемым. Не зависит от выбранного периода.',
        en: 'Sum of amounts from all open (incomplete) tasks marked as "expense" with a filled amount. This is a snapshot of expected spending — until a task is closed, the expense is planned. Not affected by the selected period.',
      },
    },
  },

  'kpi.net_profit': {
    title: { ru: 'Чистая прибыль', en: 'Net profit' },
    description: { ru: 'Доходы минус расходы', en: 'Income minus expense' },
    help: {
      summary: {
        ru: 'Чистая прибыль за период: доходы минус расходы',
        en: 'Net profit for the period: income minus expense',
      },
      details: {
        ru: 'Считается как разница между всеми доходами и расходами по закрытым задачам в периоде. Положительное число — заработали больше, чем потратили. Дельта показывает, насколько изменилась прибыль по сравнению с предыдущим периодом такой же длины.',
        en: 'Calculated as the difference between all income and expense from closed tasks in the period. A positive number means you earned more than you spent. The delta shows how profit changed vs the previous equivalent period.',
      },
    },
  },

  'kpi.amount_coverage': {
    title: { ru: 'Заполнено amount', en: 'Amount coverage' },
    description: { ru: '% задач с заполненной суммой', en: '% of tasks with amount filled' },
    help: {
      summary: {
        ru: 'Доля задач с заполненным полем суммы',
        en: 'Share of tasks with the amount field filled',
      },
      details: {
        ru: 'Показатель качества данных для финансовой аналитики. Если % низкий — графики «Доходы/расходы» и «Топ проектов» отражают только малую часть реальности. Стоит либо не доверять им, либо наладить практику заполнения amount/transactionType.',
        en: 'Data quality indicator for financial analytics. If this percentage is low, the Income/Expense and Top Projects charts only reflect a small slice of reality — either treat them with caution or establish a practice of filling the amount/transactionType fields.',
      },
    },
  },

  // ===== Productivity =====

  'chart.throughput': {
    title: { ru: 'Создано vs закрыто', en: 'Created vs completed' },
    description: {
      ru: 'Баланс входящей и закрываемой работы',
      en: 'Balance of incoming and completed work',
    },
    help: {
      summary: {
        ru: 'Созданные и закрытые задачи по периодам',
        en: 'Created and completed tasks over time',
      },
      details: {
        ru: 'Главный индикатор здоровья проекта. Зазор между линиями — предупреждение: вы создаёте больше, чем закрываете, и бэклог растёт. Постоянный зазор → накопление долга, команда не справляется. Линии близко друг к другу → работа идёт в темпе поступления.',
        en: 'The primary project health indicator. A gap between the lines is a warning — creation outpaces completion, so the backlog is growing. A persistent gap means the team is falling behind; tight lines mean work is getting done at the rate it arrives.',
      },
    },
    datasets: {
      created: { ru: 'Создано', en: 'Created' },
      completed: { ru: 'Закрыто', en: 'Completed' },
    },
    yAxisLabel: { ru: 'Задач', en: 'Tasks' },
  },

  'chart.priority_mix': {
    title: { ru: 'Приоритеты создаваемых задач', en: 'Priority mix over time' },
    description: { ru: 'Распределение новых задач по приоритету', en: 'Distribution of new tasks by priority' },
    help: {
      summary: {
        ru: 'Как меняется распределение приоритетов у создаваемых задач',
        en: 'How priority mix of newly created tasks shifts over time',
      },
      details: {
        ru: 'Если доля High растёт — вероятно, проблемы с планированием или команда в режиме пожаротушения. Здоровая продуктовая работа имеет больше Medium и Low, чем High. Также обратите внимание на долю задач «Без приоритета» — это сигнал плохой практики триажа.',
        en: 'If the High share grows, the team may be firefighting or planning poorly. Healthy product work has more Medium/Low than High. Also watch the "No priority" share — a large portion points to poor triage practice.',
      },
    },
    datasets: {
      high: { ru: 'Высокий', en: 'High' },
      medium: { ru: 'Средний', en: 'Medium' },
      low: { ru: 'Низкий', en: 'Low' },
      none: { ru: 'Без приоритета', en: 'No priority' },
    },
    yAxisLabel: { ru: 'Создано задач', en: 'Tasks created' },
  },

  // ===== Workload =====

  'chart.workload_by_assignee': {
    title: { ru: 'Нагрузка по исполнителям', en: 'Workload by assignee' },
    description: { ru: 'Открытые задачи, сгруппированные по приоритету', en: 'Open tasks grouped by priority' },
    help: {
      summary: {
        ru: 'Количество открытых задач на каждого исполнителя с разбивкой по приоритету',
        en: 'Open tasks per assignee, broken down by priority',
      },
      details: {
        ru: 'Быстрый взгляд на перегруз команды. Если у одного человека 15+ задач или много High-приоритета — нужно перераспределить нагрузку. Это не рейтинг эффективности: размер задач разный, и некоторые люди формально числятся в assignee, но не работают.',
        en: 'A quick check for team overload. If one person has 15+ tasks or many High-priority items, workload needs rebalancing. This is not a performance ranking: task sizes vary and some people appear as formal assignees without actively working.',
      },
    },
    datasets: {
      high: { ru: 'Высокий', en: 'High' },
      medium: { ru: 'Средний', en: 'Medium' },
      low: { ru: 'Низкий', en: 'Low' },
      no_priority: { ru: 'Без приоритета', en: 'No priority' },
    },
    xAxisLabel: { ru: 'Задач', en: 'Tasks' },
  },

  'chart.blocked_by_deps': {
    title: { ru: 'Заблокировано зависимостями', en: 'Blocked by dependencies' },
    description: { ru: 'Открытые задачи, ждущие завершения зависимостей', en: 'Open tasks waiting on incomplete prerequisites' },
    help: {
      summary: {
        ru: 'Открытые задачи, которые не могут стартовать, пока не закрыты их предшественники',
        en: 'Open tasks that cannot start until their predecessors are completed',
      },
      details: {
        ru: 'Явные блокеры процесса — здесь нужно вмешательство PM в первую очередь. Высокое число = поток остановлен, нужно разблокировать ключевые задачи. Зависимости берутся из графа задач (стрелка от A к B = B зависит от A).',
        en: 'Explicit process blockers — the PM should address these first. A high count means the pipeline is stalled and key prerequisites need attention. Dependencies are derived from the task graph (an arrow from A to B means B depends on A).',
      },
    },
    datasets: {
      blocked: { ru: 'Заблокировано', en: 'Blocked' },
    },
    xAxisLabel: { ru: 'Задач', en: 'Tasks' },
  },

  'chart.time_in_kanban_status': {
    title: { ru: 'Время в колонках канбана', en: 'Time in kanban columns' },
    description: { ru: 'Среднее время жизни открытой задачи в каждом статусе', en: 'Average open-task age per kanban column' },
    help: {
      summary: {
        ru: 'Среднее время, которое открытые задачи проводят в каждом статусе',
        en: 'Average age of open tasks broken down by kanban column',
      },
      details: {
        ru: 'Выявляет узкие места процесса. Если задачи застревают в «Review» на 5+ дней — не хватает ревьюеров. Если в «In Progress» — WIP-лимит превышен. Требует выбора проекта, потому что колонки канбана уникальны для каждого.',
        en: 'Reveals process bottlenecks. If tasks sit in "Review" for 5+ days, you lack reviewers; long times in "In Progress" mean the WIP limit is exceeded. Requires selecting a project because kanban columns are unique per project.',
      },
    },
    datasets: {
      avg_days: { ru: 'Среднее время в колонке', en: 'Avg time in column' },
    },
    yAxisLabel: { ru: 'Дней', en: 'Days' },
  },

  'chart.aging_open_tasks': {
    title: { ru: 'Возраст открытых задач', en: 'Aging of open tasks' },
    description: { ru: 'Средний и максимальный возраст открытых задач по исполнителям', en: 'Average and maximum open-task age per assignee' },
    help: {
      summary: {
        ru: 'Сколько дней прошло с момента создания открытых задач, по исполнителям',
        en: "Days since creation for each assignee's open tasks",
      },
      details: {
        ru: join([
          'Что считается «возрастом»:',
          'Сколько дней прошло с момента создания задачи до сегодня. Например: задача создана 1 апреля, сегодня 21 апреля → возраст = 20 дней.',
          '',
          'Что показывает график:',
          'Для каждого исполнителя берутся все его открытые (незавершённые) задачи и считается:',
          '• Средний возраст — насколько старые в среднем его задачи',
          '• Максимум — возраст самой старой его открытой задачи',
          '',
          'Как читать:',
          '• Высокий средний → накопилось много старых задач: возможно, перегруз или человек не двигает бэклог',
          '• Высокий максимум при низком среднем → в целом всё быстро, но есть одна-две «висящих» задачи — добить или закрыть как устаревшие',
          '• Оба значения низкие → задачи либо свежие, либо быстро закрываются — здоровая ситуация',
          '• Большой разрыв между ними → есть «тяжёлые хвосты»: отдельные давние задачи выбиваются из общего ритма',
          '',
          'Нюансы:',
          '• Учитываются исполнители (assignee), а не создатели задач',
          '• Если задача назначена двоим — попадёт к обоим (это корректно: оба за неё отвечают)',
          '• Сверху списка — исполнители с самой старой в среднем работой',
          '',
          'Что НЕ измеряется:',
          '• Время в работе — это отдельная метрика Cycle Time',
          '• Время до дедлайна — смотрите Overdue-метрики',
          '• Эффективность — старая задача может быть просто большой или заблокированной',
        ]),
        en: join([
          'What "age" means:',
          'How many days have passed since the task was created until today. Example: task created Apr 1, today is Apr 21 → age = 20 days.',
          '',
          'What the chart shows:',
          'For each assignee, we take all their open (incomplete) tasks and compute:',
          '• Average age — how old their tasks are on average',
          '• Max — age of their oldest open task',
          '',
          'How to read it:',
          '• High average → lots of old tasks piled up: possibly overloaded or not moving the backlog',
          '• High max with low average → generally fast, but one or two "stuck" tasks — finish them or close as obsolete',
          '• Both low → tasks are either fresh or closed quickly — a healthy state',
          '• Large gap between them → "heavy tails": isolated old tasks breaking away from the norm',
          '',
          'Notes:',
          '• Counted by assignee, not by creator',
          '• A task assigned to two people appears for both (correct: both are responsible)',
          '• Top of the list = assignees with the oldest typical work',
          '',
          'What is NOT measured:',
          "• Time in active work — that's the separate Cycle Time metric",
          '• Time until deadline — see Overdue metrics',
          '• Efficiency — an old task may simply be large or blocked',
        ]),
      },
    },
    datasets: {
      avg_age: { ru: 'Средний возраст', en: 'Average age' },
      max_age: { ru: 'Максимум', en: 'Max' },
    },
    xAxisLabel: { ru: 'Дней', en: 'Days' },
  },

  // ===== Quality =====

  'chart.overdue_by_age': {
    title: { ru: 'Просроченные по срокам давности', en: 'Overdue by age' },
    help: {
      summary: {
        ru: 'Просроченные задачи, сгруппированные по времени с даты дедлайна',
        en: 'Overdue tasks grouped by how long they have been overdue',
      },
      details: {
        ru: 'Приоритизация «тушения пожаров». Задачи, просроченные 1-3 дня — скорее всего в работе и скоро закроются. 15+ дней — либо срочно решать, либо закрывать как устаревшие: такие дедлайны уже потеряли смысл.',
        en: 'Firefighting priority. Tasks overdue 1–3 days are likely close to finishing. Tasks overdue 15+ days need urgent resolution or should be closed as obsolete — those deadlines have already lost meaning.',
      },
    },
    datasets: {
      overdue: { ru: 'Просрочено', en: 'Overdue' },
    },
    yAxisLabel: { ru: 'Задач', en: 'Tasks' },
  },

  'chart.cycle_time_histogram': {
    title: { ru: 'Распределение cycle time', en: 'Cycle time distribution' },
    description: {
      ru: 'Сколько задач закрылось в каждом диапазоне по длительности',
      en: 'How many tasks closed in each duration range',
    },
    help: {
      summary: {
        ru: 'Сколько закрытых задач попало в каждый диапазон по длительности',
        en: 'How many completed tasks fall into each duration range',
      },
      details: {
        ru: join([
          'Что показывает:',
          'Все закрытые за период задачи разбиты на 6 диапазонов по длительности (от создания до закрытия). Столбец показывает, сколько задач попало в каждый диапазон.',
          '',
          'Как читать:',
          '• Большинство в «<1д» и «1-3д» → команда закрывает задачи быстро',
          '• Перевес в «7-14д» и больше → задачи крупные или долго лежат в бэклоге',
          '• Высокий столбец в «30+д» → есть проблема с давними задачами, которые наконец-то были закрыты',
          '',
          'Нюанс:',
          'Учитывается полная жизнь задачи — от создания до закрытия, включая время в бэклоге. Задача, созданная 2 месяца назад и закрытая за день, попадёт в «30+д», а не в «<1д».',
        ]),
        en: join([
          'What it shows:',
          'All tasks closed during the period are split into 6 duration buckets (from creation to completion). Each bar shows how many tasks fell into that bucket.',
          '',
          'How to read it:',
          '• Most in "<1d" and "1-3d" → team closes tasks quickly',
          '• Skewed toward "7-14d" and higher → tasks are large or sit in the backlog for a long time',
          '• Tall bar in "30+d" → old tasks finally closed, signalling backlog debt',
          '',
          'Note:',
          'Measures the full task life — from creation to close, including time spent in the backlog. A task created 2 months ago and finished in a day lands in "30+d", not "<1d".',
        ]),
      },
    },
    datasets: {
      tasks: { ru: 'Задач', en: 'Tasks' },
    },
    xAxisLabel: { ru: 'Длительность', en: 'Duration' },
    yAxisLabel: { ru: 'Задач', en: 'Tasks' },
  },

  'chart.stale_tasks': {
    title: { ru: 'Забытые задачи', en: 'Stale tasks' },
    description: { ru: 'Открытые задачи без изменений более 30 дней', en: 'Open tasks without changes for over 30 days' },
    help: {
      summary: {
        ru: 'Открытые задачи, по которым не было никаких изменений более 30 дней',
        en: 'Open tasks with no changes for more than 30 days',
      },
      details: {
        ru: 'Карта «где гниёт работа» по проектам. Кандидаты либо на чистку (удалить устаревшее), либо на ре-активацию (если всё ещё актуально). Большое число на проекте = бэклог перегружен неактуальной работой, пора провести ревью.',
        en: '"Where work rots" — per project. Candidates for cleanup (delete obsolete) or reactivation (if still relevant). A high number on a project means the backlog is bloated with obsolete work and needs a review.',
      },
    },
    datasets: {
      stale: { ru: 'Без движения >30д', en: 'No activity >30d' },
    },
    xAxisLabel: { ru: 'Задач', en: 'Tasks' },
  },

  'chart.cycle_time_per_project': {
    title: { ru: 'Cycle time по проектам', en: 'Cycle time per project' },
    description: { ru: 'Медианное время выполнения закрытых задач', en: 'Median completion time for finished tasks' },
    help: {
      summary: {
        ru: 'Сколько в среднем задача живёт от создания до закрытия в каждом проекте',
        en: 'How long a task typically lives from creation to completion in each project',
      },
      details: {
        ru: join([
          'Что показывает:',
          'Для каждого проекта — типичное время, за которое задача проходит путь от создания до закрытия. Используется медиана: «половина задач в этом проекте закрывается быстрее, чем за X дней».',
          '',
          'Какие задачи учитываются:',
          'Только закрытые задачи, у которых дата закрытия попадает в выбранный период. Проекты без закрытых задач за период не показаны.',
          '',
          'Как читать:',
          'Видно, какие проекты движутся быстрее, какие медленнее. Если один проект в 2-3 раза медленнее остальных — повод поговорить с его PM: возможно, мешают блокеры, задачи слишком крупные или процесс провисает.',
          '',
          '⚠ Не пугайтесь больших чисел:',
          '',
          '1. Считается полная жизнь задачи, а не время в работе.',
          'Если задача 2 месяца лежала в бэклоге, а потом её сделали за 3 дня — здесь будет 63 дня. Реальное «время в работе» — только 3 из них. К сожалению, отделить «время лежания» от «времени работы» пока нельзя.',
          '',
          '2. Период фильтрует по дате закрытия, не создания.',
          'Задача создана в январе, закрыта в апреле — попадёт в апрельский период. Её время = вся её жизнь (95 дней), а не «время за апрель».',
          '',
          '3. Используется медиана, а не среднее.',
          'Один задавненный тикет, который наконец-то закрыли, не сломает показатель. Медиана говорит честно: «половина задач закрывается быстрее».',
          '',
          '4. Не сравнивайте напрямую разные по сути проекты.',
          'Маркетинг с короткими постами и разработка с крупными фичами имеют разные «нормальные» значения. Сравнивайте проект сам с собой во времени, а не с соседями по списку.',
        ]),
        en: join([
          'What it shows:',
          "For each project — the typical time a task spends from creation to completion. We use the median: \"half of this project's tasks close faster than X days\".",
          '',
          'Which tasks are counted:',
          'Only closed tasks whose completion date falls within the selected period. Projects with no completions in the period are hidden.',
          '',
          'How to read it:',
          "You can see which projects move faster and which slower. If one project is 2–3× slower than the rest, it's worth talking to its PM — there may be blockers, oversized tasks, or a sagging process.",
          '',
          "⚠ Don't panic over big numbers:",
          '',
          '1. We count the full task life, not just time in active work.',
          "If a task sat in the backlog for 2 months and was then done in 3 days, it counts as 63 days. The actual \"in-progress\" time was only 3 days. We can't separate \"waiting\" from \"working\" yet.",
          '',
          '2. The period filters by completion date, not creation.',
          'A task created in January and closed in April lands in the April period. Its time = its whole life (95 days), not "time during April".',
          '',
          '3. We use the median, not the mean.',
          "A long-forgotten ticket that finally closed won't break the metric. The median says honestly: \"half of the tasks close faster\".",
          '',
          "4. Don't directly compare projects of different nature.",
          'A marketing project with short posts and a dev project with large features have different normal values. Compare a project against itself over time, not against its neighbors in the list.',
        ]),
      },
    },
    datasets: {
      median: { ru: 'Медиана cycle time', en: 'Median cycle time' },
    },
    xAxisLabel: { ru: 'Дней', en: 'Days' },
  },

  // ===== Usage =====

  'chart.status_distribution': {
    title: { ru: 'Распределение по статусам', en: 'Status distribution' },
    description: {
      ru: 'Открытые задачи в колонках канбана',
      en: 'Open tasks across kanban columns',
    },
    help: {
      summary: {
        ru: 'Доли открытых задач в каждой колонке канбана выбранного проекта',
        en: 'Share of open tasks in each kanban column of the selected project',
      },
      details: {
        ru: 'Моментальный снимок «где сейчас концентрация работы». Перекос в одну колонку (например, «In Review») = процесс застрял там, нужно разблокировать. Требует выбора проекта, потому что колонки канбана у каждого проекта свои.',
        en: 'A snapshot of "where the work currently sits". A heavy skew into one column (e.g. "In Review") means the process is stuck there and needs unblocking. Requires selecting a project because each project has its own kanban columns.',
      },
    },
    datasets: {
      count: { ru: 'Задач', en: 'Tasks' },
    },
  },

  'chart.active_projects': {
    title: { ru: 'Активные vs мёртвые проекты', en: 'Active vs dead projects' },
    description: { ru: 'По активности за 14 / 30 дней', en: 'By activity in last 14 / 30 days' },
    help: {
      summary: {
        ru: 'Сколько проектов активны, затухают или мертвы по последней активности',
        en: 'How many projects are active, fading, or dead by recent activity',
      },
      details: {
        ru: join([
          'Что показывает:',
          'Все ваши проекты разбиты на 4 группы по тому, когда в них последний раз что-то делали:',
          '• Активен — были изменения за последние 14 дней',
          '• Затухает — последние правки 14-30 дней назад',
          '• Мёртв — никакой активности более 30 дней',
          '• Без задач — проект создан, но задач в нём нет',
          '',
          'Зачем смотреть:',
          'Мёртвые и пустые проекты захламляют боковое меню — их можно архивировать, чтобы было видно только живое. Затухающие — повод проверить, всё ли в порядке (закрыли тему или забыли).',
          '',
          'Drill-down:',
          'Кликните по столбцу или сектору, чтобы посмотреть открытые задачи в проектах этой категории. Особенно полезно для «мёртвых» — увидите, что лежит в заброшенных проектах.',
        ]),
        en: join([
          'What it shows:',
          'All your projects split into 4 groups based on when something was last done in them:',
          '• Active — there were edits in the last 14 days',
          '• Fading — last edits 14-30 days ago',
          '• Dead — no activity for over 30 days',
          '• Empty — project exists but has no tasks',
          '',
          'Why look at it:',
          'Dead and empty projects clutter the sidebar — archive them to keep only the live ones in view. Fading projects are worth a check — finished or forgotten.',
          '',
          'Drill-down:',
          "Click a bar or sector to see open tasks in projects of that category. Especially useful for \"dead\" — see what's lying in abandoned projects.",
        ]),
      },
    },
    datasets: {
      count: { ru: 'Проектов', en: 'Projects' },
    },
    yAxisLabel: { ru: 'Проектов', en: 'Projects' },
  },

  // ===== Financial =====

  'chart.income_expense_month': {
    title: { ru: 'Доходы и расходы по месяцам', en: 'Income and expense per month' },
    description: { ru: 'Суммы завершённых финансовых задач', en: 'Amounts of completed financial tasks' },
    help: {
      summary: {
        ru: 'Суммы завершённых финансовых задач, сгруппированные по месяцам',
        en: 'Completed financial task amounts grouped by month',
      },
      details: {
        ru: 'Требует заполнения полей Amount и Transaction Type на задачах. Используется командами, ведущими лёгкий финансовый трекинг в TaskView (частый кейс у small business). Для достоверности проверьте KPI «Заполнено amount» — при низком покрытии картина неполная.',
        en: 'Requires the Amount and Transaction Type fields to be filled on tasks. Used by teams running lightweight financial tracking inside TaskView (common small-business case). Cross-check with the "Amount coverage" KPI — a low coverage means the picture is incomplete.',
      },
    },
    datasets: {
      income: { ru: 'Доходы', en: 'Income' },
      expense: { ru: 'Расходы', en: 'Expense' },
    },
    yAxisLabel: { ru: 'Сумма', en: 'Amount' },
  },

  'chart.income_expense_per_project': {
    title: { ru: 'Доходы и расходы по проектам', en: 'Income and expense per project' },
    description: {
      ru: 'Сколько каждый проект принёс и сколько потратил',
      en: 'How much each project earned and spent',
    },
    help: {
      summary: {
        ru: 'Доходы и расходы каждого проекта рядом, чтобы сравнить напрямую',
        en: 'Income and expense for each project side-by-side for direct comparison',
      },
      details: {
        ru: join([
          'Что показывает:',
          'Для каждого проекта — два столбца рядом: зелёный (доходы) и красный (расходы). Берутся суммы из задач, где у вас отмечена сумма и тип транзакции.',
          '',
          'Чем отличается от «Топ проектов по сумме»:',
          'Там показан общий оборот — высота столбца = доходы + расходы вместе. Здесь — сравнение двух величин напрямую: видно, где проект зарабатывает больше, чем тратит, а где наоборот.',
          '',
          'Как читать:',
          '• Зелёный выше красного → проект прибыльный',
          '• Красный выше зелёного → проект пока в минус',
          '• Оба маленькие → слабая активность или вы редко заполняете финансовые поля',
          '',
          'Сортировка — по чистой прибыли по убыванию: прибыльные проекты сверху.',
          '',
          'Что нужно для попадания в график:',
          'У задачи должна быть указана сумма и тип (доход/расход). Если вы не пользуетесь финансовыми полями TaskView — этот график будет пустым. Чтобы понять качество данных, смотрите карточку «Заполнено amount».',
          '',
          'Что НЕ включено:',
          '• Задачи без указанной суммы',
          '• Задачи без типа транзакции',
          '• Реальная прибыль после налогов и комиссий — TaskView показывает только то, что вы ввели сами',
        ]),
        en: join([
          'What it shows:',
          "For each project — two side-by-side bars: green (income) and red (expense). The numbers come from tasks where you've filled in an amount and transaction type.",
          '',
          'Difference from "Top projects by amount":',
          'That chart shows total turnover — bar height = income + expense combined. This one compares the two values directly: you can see which project earns more than it spends and vice versa.',
          '',
          'How to read it:',
          '• Green taller than red → project is profitable',
          '• Red taller than green → project is in the red so far',
          '• Both small → weak activity or you rarely fill in financial fields',
          '',
          'Sorted by net profit descending: profitable projects on top.',
          '',
          "What's needed to appear on the chart:",
          "A task needs both an amount and a type (income/expense). If you don't use TaskView's financial fields, this chart will be empty. To gauge data quality, check the \"Amount coverage\" card.",
          '',
          'What is NOT included:',
          '• Tasks without an amount',
          '• Tasks without a transaction type',
          '• Real profit after taxes and fees — TaskView only shows what you enter yourself',
        ]),
      },
    },
    datasets: {
      income: { ru: 'Доходы', en: 'Income' },
      expense: { ru: 'Расходы', en: 'Expense' },
    },
    yAxisLabel: { ru: 'Сумма', en: 'Amount' },
  },

  'chart.top_projects_by_amount': {
    title: { ru: 'Топ проектов по сумме', en: 'Top projects by amount' },
    description: { ru: 'Суммарный доход и расход в каждом проекте', en: 'Total income and expense per project' },
    help: {
      summary: {
        ru: 'Проекты, отсортированные по суммарному финансовому обороту',
        en: 'Projects ranked by total financial turnover',
      },
      details: {
        ru: 'Где крутятся деньги. Income + Expense как стек показывает полный оборот, а не только прибыль — так видно и затратные проекты, а не только прибыльные. Для сравнения чистой прибыли смотрите разницу сегментов.',
        en: 'Shows where the money flows. Stacking income and expense reveals total turnover, not just profit — so expensive projects are visible, not only profitable ones. To compare net profit, eyeball the segment gap.',
      },
    },
    datasets: {
      income: { ru: 'Доходы', en: 'Income' },
      expense: { ru: 'Расходы', en: 'Expense' },
    },
    xAxisLabel: { ru: 'Сумма', en: 'Amount' },
  },
} satisfies Record<string, SectionLocale>

export type SectionLocaleId = keyof typeof sectionLocales
