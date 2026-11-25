# JS2Go Agent Testability Experiment

**Статус:** спецификация для реализации первой экспериментальной ревизии  
**Репозиторий:** https://github.com/mikhail-angelov/playground  
**Стек:** существующий JS2Go (Next.js/TypeScript), Node.js, Playwright Test, Codex CLI  
**Версия:** 1.0

## 1. Цель

Проверить экспериментально, насколько адаптация существующего web UI стандартными средствами HTML улучшает способность coding agent самостоятельно генерировать корректные воспроизводимые E2E-тесты по короткому естественно-языковому брифу. Исследуются как host UI JS2Go, так и генерируемое приложение внутри preview.

Основная гипотеза: семантические идентификаторы уменьшают неоднозначность локаторов; нативная HTML-семантика, accessibility и наблюдаемые состояния дополнительно уменьшают стоимость discovery, число неудачных действий, синхронизационных ошибок и исправлений теста.

Эксперимент измеряет эффективность конкретной комбинации приложения, модели, агентного harness и браузерных инструментов; результаты не считаются универсальным доказательством пригодности всех сайтов для всех агентов.

### 1.1. Не входит в scope

- Собственный DSL, manifest, MCP-сервер, SDK или протокол для сайта.
- Собственный Semantic UI Graph, embeddings, context delta, автоматический recorder.
- Разработка линтера и Codex skill для адаптации сайтов: это следующий проект после анализа результатов.
- Изменение UI ради упрощения сценария, изменение продуктовой логики, переход на другой framework.
- Tetris, Canvas, новые бизнес-сценарии, полноценный accessibility-аудит всего продукта.
- CI quality gate и интегральный Agent Readiness Score.

## 2. Экспериментальный дизайн

Три накопительные ревизии. Зафиксировать git commit каждой ревизии и hash экспериментального окружения. Harness, бриф, модель, reasoning effort, настройки Playwright, браузер, права и бюджеты одинаковы во всех ревизиях. Экспериментальный код хранится отдельно от модификаций продукта.

| Ревизия | Host UI | Сгенерированный калькулятор |
|---|---|---|
| R0 | Исходный UI без адаптации | Исходная генерация |
| R1 | Стабильные семантические HTML id | Стабильные семантические HTML id |
| R2 | R1 + HTML semantics, ARIA, состояния | R1 + HTML semantics, ARIA, состояния |

Ревизии накопительные: R2 не удаляет полезные IDs R1. Не исправлять baseline задним числом. Если исходный сценарий действительно неработоспособен, зафиксировать дефект; отдельно согласовать минимальное исправление и повторно заморозить baseline до продолжения. Нельзя считать исходный дефект ошибкой агента.

### 2.1. Разделение ролей

- Implementation agent: исследует репозиторий, реализует harness и адаптирует UI по этой спецификации.
- Benchmark agent: получает короткий бриф, URL и неизменный generic tooling; пишет и запускает тест. Не изменяет приложение, fixture, конфигурацию эксперимента или grader.
- Runner/grader: независимый детерминированный процесс Node.js, запускающий Codex, Playwright replay и проверки результатов.

Каждая попытка — новая сессия Codex, новая директория задания и чистое состояние приложения. Не использовать resume, старые сообщения, предыдущие тесты, отчёты или навыки, описывающие JS2Go. Контролировать AGENTS.md, глобальные skills и MCP-конфигурацию. В основной серии benchmark agent работает black-box: ему доступны browser tooling, общий шаблон Playwright и собственные временные файлы, но не исходники приложения и не эталонный тест. При необходимости отдельно исследовать white-box режим, не смешивая результаты.

## 3. Фиксированный сценарий CALC-01

Тестируется полный вертикальный пользовательский сценарий: создать новый проект, отправить запрос к AI, получить код, применить код к проекту, запустить preview и проверить вычисления через UI внутри iframe.

### 3.1. Бриф для benchmark agent (дословно, одинаковый во всех ревизиях)

> Открой локальный JS2Go. Создай новый проект. Через AI-помощника создай калькулятор, используя запрос «Create a simple calculator with digit buttons, addition, multiplication, equals and clear. Display the current result.» Дождись генерации исходного кода, убедись, что код получен, примени его к проекту и запусти приложение. В интерфейсе калькулятора вычисли 12 + 8 и проверь результат 20. Очисти калькулятор, вычисли 6 × 7 и проверь результат 42. Напиши один воспроизводимый Playwright E2E-тест на TypeScript и проверь его запуск. Не изменяй тестируемое приложение. Сохрани тест в указанную директорию.

12 + 8 = 20 выбрано как фиксированный пример суммы (пользователь не задал операнды). Вторая операция задана пользователем: 6 × 7 = 42. Умножение после очистки проверяет независимость последовательных операций, а двузначное слагаемое проверяет ввод нескольких цифр.

### 3.2. Обязательные checkpoints

| ID | Наблюдаемое доказательство |
|---|---|
| C1 | Новый проект открыт, ID/URL относится к новому проекту |
| C2 | Фиксированный prompt введён и отправлен через UI |
| C3 | Ответ завершён и содержит непустой релевантный исходный код (не просто исчезновение spinner) |
| C4 | Сгенерированный код применён через существующее действие Patch/Apply; проверено фактическое изменение редактора или наблюдаемого исходного кода |
| C5 | Нажат Run и в соответствующем preview появилось приложение-калькулятор |
| C6 | Через реальные контролы калькулятора выполнено 12 + 8 =; отображаемый результат точно 20 |
| C7 | Через Clear сброшено состояние |
| C8 | Через реальные контролы выполнено 6 × 7 =; отображаемый результат точно 42 |

Проверять результат в конкретном элементе калькулятора, а не искать строку «42» во всём документе. Не использовать вычисление в тестовом коде, внутренний state, прямые backend API или evaluate для выполнения проверяемых операций. Read-only DOM inspection допустим. Не использовать force-click, отключение проверок, тесты без assertions, тестовые sleep вместо осмысленного ожидания, подмену результата или проглатывание ошибок. Не требовать, чтобы любой калькулятор имел одинаковый внутренний state после Clear: допустимые отображения 0 или пустой результат определяются наблюдаемым UI.

### 3.3. Эталонный контроль

Implementation agent создаёт приватный reference E2E test для каждой ревизии (общая логика, допустимы разные локаторы) для проверки исправности приложения и fixture. Reference test не виден benchmark agent и не входит в метрики генерации. При неуспехе reference test ревизию не признавать валидной, не удалять неудачные попытки из истории.

## 4. Воспроизводимость генерации приложений

Нельзя сравнивать три ревизии только на независимых live-ответах генератора: различия в функциональности и качестве калькуляторов могут доминировать над эффектом семантики.

### 4.1. Основная серия: recorded response

1. На R0 выполнить реальный запрос через исходный JS2Go и сохранить успешный ответ AI вместе с фактическим форматом streaming/response, который потребляет текущий клиент.
2. Сохранить R0 calculator fixture без семантической адаптации. Убедиться, что исходный калькулятор корректно считает обе операции. Если первый ответ дефектный, сохранить факт и причину отбора следующего ответа; критерий отбора только функциональность, не удобство для агента.
3. Подготовить R1 fixture на основе того же кода: добавить только семантические IDs. R2 fixture — на основе R1, добавить только семантику/ARIA/наблюдаемые состояния. Не менять алгоритм вычислений, внешний вид и расположение контролов. Зафиксировать diff и hashes.
4. Replay подменяет только ответ AI-генератора на границе зависимости (локальный mock upstream либо Playwright route, если запрос действительно browser-side; конкретный способ выбрать после инспекции `useAi` и server routes). Существующие операции request, streaming/parser, Apply, Run и calculator UI остаются реальными.
5. Сохранять реалистичный фиксированный график chunks/задержек для всех ревизий. Отличающаяся длина ответа допустима; не давать адаптированным ревизиям искусственное преимущество по latency.

Если технически необходим общий тестовый seam, внедрить его до заморозки R0, только в локальном тестовом режиме; он одинаков во всех ревизиях. Mock не должен выставлять флаги успеха, записывать код в store вместо UI или менять DOM проверяемых операций.

### 4.2. Дополнительная серия: live generation

Проверяет реальную способность генератора следовать инструкциям по семантике и получать пригодный к тестированию код. Не объединять статистику с recorded series.

- R0: исходный system prompt генератора.
- R1: добавить инструкцию о semantic HTML IDs.
- R2: сохранить IDs и дополнить инструкциями о семантическом HTML, labels, ARIA и наблюдаемых состояниях.
- Пользовательский prompt из CALC-01 неизменен. Фиксировать provider/model, параметры и hash system prompt, задержку, фактические токены генератора, качество кода и ошибки генерации. Если provider не выдаёт usage — `null`, а не оценка, выданная за факт.
- Рекомендуется 3–5 независимых попыток на ревизию при наличии доступа и бюджета. Основной вывод строить на recorded series. Live series не обязательна для завершения MVP, но как минимум первоначальная запись реального ответа обязательна, если доступна модель; при недоступности использовать явно помеченный synthetic fixture и не заявлять о проверке live generation.

## 5. Инструментарий и окружение

### 5.1. Playwright

Использовать `@playwright/test`, Chromium, headless, одинаковые viewport/locale/timezone. Зафиксировать версии Node, npm, Playwright, browser revision, Codex, OS и model ID. Настройки timeout одинаковы для всей серии.

- `webServer` либо отдельный orchestrator запускает существующий локальный JS2Go согласно проверенным npm scripts/README. Не предполагать команду старта без проверки package.json.
- `baseURL` — локальный адрес; не обращаться к production JS2Go.
- `workers: 1`, `retries: 0` для основной метрики first pass; `trace: 'on'` либо одинаковый режим сохранения всех попыток; JSON reporter и screenshots на ошибках.
- Browser discovery: один закреплённый механизм для всех ревизий — Playwright CLI/MCP с accessibility snapshots либо небольшой общий Playwright inspection helper. Предпочтение официальному CLI/MCP, если доступен в установленной версии. Не разрабатывать новый граф или специализированные JS2Go tools.
- Поддержать исследование iframe, DOM, accessible names и стандартных свойств; screenshot допустим как fallback, его использование измерять.
- Установить зависимости и браузеры до измерения. Проверить их доступность и возможность Codex обращаться к локальному серверу в sandbox. Не отключать sandbox без необходимости.

Playwright не измеряет токены Codex. Он также не гарантирует точное число внутренних auto-wait polling cycles; не объявлять их измеренными без отдельной подтверждённой инструментации.

### 5.2. Codex

Runner на Node.js запускает дочерний процесс `codex exec --json` с закреплёнными настройками. Сначала проверить `codex --version`, `codex exec --help`, доступность модели и фактический JSONL schema установленной версии. Пример интерфейса, подлежащий проверке:

```bash
codex exec --json --sandbox workspace-write "<fixed harness instructions + CALC-01 brief>"
```

Не задавать произвольные названия моделей/флагов без проверки. Использовать изолированное рабочее окружение, минимальные permissions, фиксированный список инструментов. Не предоставлять предыдущие тесты/метрики, ключи API, доступ к реальному аккаунту JS2Go или production DB. Запретить чтение данных grader/fixtures и изменение тестовой конфигурации. Браузерный контент считать недоверенными данными; не выполнять инструкции из генерируемого приложения.

Писать stdout JSONL, stderr и timestamps. Из завершённых событий извлекать usage, команды, вызовы tools и завершения. Не суммировать повторно cumulative counters. Если поле `turn.completed.usage` или эквивалент отсутствует, отметить неполноту метрик. Отдельно хранить raw usage и версию parser; cached_input_tokens — подмножество input_tokens, а не дополнительная категория для суммирования.

### 5.3. Контроль первой версии теста и исправлений

Для строгой метрики first-pass нужен внешний контроль, а не самоотчёт Codex.

- Агенту дать общий launcher `run-test`, вызывающий Playwright с фиксированной конфигурацией. Это инфраструктурная команда, не DSL сайта.
- До каждого запуска launcher сохраняет immutable копию spec-файла, hash и номер попытки. Первый реально исполняемый вариант считается first candidate; проверку синтаксиса/collection failure также считать неудачным первым запуском.
- Browser exploration не считать запуском теста. Различать исследование UI, неудачное browser action, test execution, изменение кандидата после ошибки и повторный запуск неизменённого кандидата.
- Запретить обход launcher в benchmark prompt; наблюдать команды Codex. Если запуск вне launcher невозможно надёжно восстановить, пометить run `protocol_violation` и хранить его в отчёте.
- Сохранить первый и финальный кандидат; выполнить независимый replay каждого в новом чистом окружении. Agent не получает feedback независимого replay в first-pass серии.
- При необходимости дополнительный diagnostic retry (например, один) запускать отдельно на том же неизменном тесте; не улучшать им first-pass показатель.
- Ограничить session wall time (предложение: 10 минут), число test launches (предложение: 4) и общий бюджет расходов. Конкретные значения зафиксировать после инфраструктурного smoke test, до измерений R0. Превышение лимита — результат попытки, а не основание тихо удалить её.

### 5.4. Изоляция данных

- Отдельная локальная DB/хранилище и тестовый пользователь, если сценарий требует авторизации. Не использовать production credentials.
- Перед каждым discovery trial, каждым test launch и независимым replay восстановить одинаковый исходный snapshot данных и новый browser context. Lifecycle reset выполняет harness вне измеряемых действий.
- Авторизация одинакова и предоставляется как storageState/fixture, если необходима; логин не является предметом CALC-01. Не подготавливать уже созданный калькулятор в проекте.
- Уникальные рабочие директории; фиксировать run ID без передачи номера ревизии агенту, если возможно. Ограничить внешние запросы сгенерированного кода, использовать безопасное локальное окружение.
- Поскольку JS2Go использует iframe srcDoc для запуска произвольного кода, проверить изоляцию и исключить секреты из окружения browser preview. Не менять sandbox semantics между ревизиями; необходимое безопасное изменение провести общим инфраструктурным шагом до baseline.

## 6. R0 — baseline

1. Изучить README, package.json, существующие Jest tests, routes и lifecycle project creation, AI request, patch, preview.
2. Зафиксировать source revision и текущие DOM/ARIA snapshots основных экранов.
3. Реализовать только общую инфраструктуру эксперимента. Не исправлять labels, IDs, landmarks, states и генерирующий prompt до первого измерения.
4. Создать reference test CALC-01 и recorded fixture.
5. Выполнить smoke run Codex и независимого replay, проверить полноту метрик. Smoke runs не входят в основной набор и явно помечаются.
6. Заморозить конфигурацию, запустить основную серию R0. Сохранить все результаты до продуктовых изменений.

## 7. R1 — semantic IDs

Добавить стабильные, уникальные, осмысленные нативные `id` в важные контролы, области и наблюдаемые элементы JS2Go. Не использовать CSS classes, случайные номера, React useId как постоянный тестовый контракт или новые data-agent-* attributes. Не добавлять ARIA или новую семантическую группировку специально в R1. Существующую семантику не удалять. Не добавлять ID всем декоративным div/span.

Пример предлагаемой схемы (имена уточнить по фактическому UI):

| Область | ID |
|---|---|
| Новый проект | `new-project` |
| Коллекция проектов | `project-list` |
| Проект в коллекции | `project-<stable-domain-id>` |
| AI prompt | `ai-prompt` |
| Генерация | `ai-generate` |
| История AI | `ai-conversation` |
| Apply | `ai-apply-code` |
| Очистка истории | `ai-clear-history` |
| Редактор | `source-editor` |
| Запуск | `preview-run` |
| iframe | `application-preview` (или сохранить существующий `iframe`, если смена ломает контракт) |
| Console output | `preview-console` |
| Калькулятор | `calculator`, `calculator-display` |
| Цифры | `calculator-digit-0` … `calculator-digit-9` |
| Операции | `calculator-add`, `calculator-multiply`, `calculator-equals`, `calculator-clear` |

Для повторяющихся контролов использовать ID доменной сущности, не индекс массива. Проверить уникальность в пределах каждого документа/frame. Использовать нативные `id` в Playwright (`locator('#ai-generate')`), а не `getByTestId`, который по умолчанию ищет data-testid. Агенту не выдавать таблицу этих IDs: он должен обнаружить их сам. Не принуждать к конкретному типу locator, сохранить общие инструкции для всех ревизий.

Адаптировать R1 recorded fixture; добавить соответствующую инструкцию в system prompt реального генератора для live series. Проверить регрессию обычных тестов и reference CALC-01. Зафиксировать diff, snapshots, commit. Запустить ту же серию измерений.

## 8. R2 — semantic HTML, accessibility, observability

Цель: максимально выразить реальные доступные действия, связи, содержимое и состояния существующими HTML/ARIA механизмами в пределах CALC-01 и непосредственно соседних контролов. Не добавлять искусственные capabilities или дублирующий manifest. Не ставить ARIA ради тестов вопреки фактической семантике.

### 8.1. Host UI

Исходники, проверенные на этапе проектирования:

- `src/app/my/page.tsx`: страница проектов и New link.
- `src/app/top/ProjectList.tsx`: коллекция реализована через div/grid.
- `src/app/top/ProjectTile.tsx`: карточка с link/image и отдельным названием; обеспечить однозначное имя ссылки даже без картинки.
- `src/app/project/[id]/AiPanel.tsx`: textarea с placeholder, иконка Generate без явного имени, Thinking..., Apply/Patch, Clear history, история сообщений и code blocks.
- `src/app/project/[id]/EditorPanel.tsx`: Monaco Editor.
- `src/app/project/[id]/PreviewPanel.tsx`: Run, iframe srcDoc с title, console и icon-only controls.
- Также проверить LeftPanel, Main, Header и другие фактически участвующие компоненты.

| Требование | Реализация |
|---|---|
| Именованные области | main, nav, section с заголовком/accessible name |
| Коллекции | ul/li или другой действительно соответствующий native pattern, именованные сущности; сохранить grid CSS |
| Контролы | Нативные button/a/input; имя через visible label или aria-label для icon-only controls |
| Формы | label, name, form, submit type; использовать required и validity только там, где это отражает реальное правило |
| Связи | for, aria-labelledby, aria-describedby, aria-controls только при фактическом отношении |
| Состояния | disabled/readonly, aria-busy, aria-expanded/selected/pressed по назначению |
| Feedback | role=status, role=alert, role=log где применимо; ошибки наблюдаемы |
| Генерация | Устойчивый доступный статус idle/generating/completed/error из реального lifecycle; отличать отсутствие ответа от завершения |
| Code application | Наблюдаемое подтверждение применения, соответствующее реальному результату; не вводить фальшивый success |
| Editor | Использовать штатный Monaco ariaLabel/accessibility; обозначить активный файл, не дублировать весь исходник в скрытом DOM |
| Preview | Именованный iframe, связь с Run при уместности, доступный console log; не считать iframe load доказательством работоспособности приложения |

Не менять существующие keyboard shortcuts, порядок действий или бизнес-валидацию. Если `required`/form submit изменяют поведение пустого запроса, сохранить текущую семантику или зафиксировать отдельное согласованное функциональное изменение; не скрывать его как accessibility refactoring. Статусы и ошибки брать из фактического store/state. Не объявлять каждый streaming token через live region: сообщать значимые изменения. Не использовать aria-hidden для нужных контролов. Не добавлять scroll/filter функции, если их не было.

Пример целевой разметки (адаптировать к реальному React lifecycle):

```html
<section aria-label="AI assistant">
  <p id="ai-status" role="status">Ready</p>
  <div role="log" aria-label="Conversation" id="ai-conversation"></div>
  <form aria-label="Generate application">
    <label for="ai-prompt">Application prompt</label>
    <textarea id="ai-prompt" name="prompt"></textarea>
    <button id="ai-generate" type="submit">Generate application</button>
  </form>
  <button id="ai-apply-code" type="button">Apply generated code</button>
</section>
```

### 8.2. Generated calculator

Сохранить IDs R1. Использовать настоящие кнопки, доступные имена для операций (Multiply, Add, Equals, Clear), именованную группу контролов, доступное отображение результата (`output` либо подходящий именованный элемент), наблюдаемые ошибки, корректную клавиатурную семантику, если она уже поддерживается. Не менять поведение вычислений и UI layout. Не добавлять новый механизм управления или тестовый API. Не скрывать визуальные символы операций ради agent labels; accessible name должен учитывать видимую надпись, где применимо.

Пример:

```html
<section id="calculator" aria-label="Calculator">
  <output id="calculator-display" aria-label="Result">0</output>
  <button id="calculator-digit-6" type="button">6</button>
  <button id="calculator-multiply" type="button" aria-label="× Multiply">×</button>
  <button id="calculator-equals" type="button" aria-label="= Equals">=</button>
</section>
```

Обновить R2 fixture и system prompt live generator. Проверить DOM и ARIA snapshots, отсутствие новых критических нарушений (опционально axe-core в отдельном audit run), корректность ссылок/IDs, reference test и существующие тесты. Заморозить commit и выполнить benchmark.

## 9. Метрики

### 9.1. Основные (per trial)

| Поле | Определение / источник |
|---|---|
| `firstCandidatePass` | Первый неизменённый candidate проходит независимый replay и обязательные checkpoints |
| `finalCandidatePass` | Финальный candidate проходит независимый replay и checkpoints |
| `taskSuccess` | Выполнен весь CALC-01, а не просто зелёный exit code |
| `agentWallMs` | От запуска Codex до завершения/таймаута |
| `timeToFirstCandidateMs` | До первого зафиксированного запуска candidate |
| `timeToValidTestMs` | До первого кандидата, впоследствии признанного валидным независимым grader; null если не получен |
| `inputTokens`, `cachedInputTokens`, `outputTokens` | Фактический usage Codex, null если отсутствует |
| `uncachedInputTokens` | inputTokens - cachedInputTokens, только если оба известны |
| `testLaunches` | Все зарегистрированные запуски кандидатов, включая failed collection |
| `repairIterations` | Количество переходов к изменённому кандидату после неудачного запуска |
| `unchangedReruns` | Повторные запуски того же hash |
| `runnerRetries` | Фактические retries Playwright Test (0 в основном режиме) |
| `replayDurationMs` | Независимый replay; не смешивать с agentWallMs |
| `generationWaitMs` | Реальная длительность генерации/ожидания, если измерима на основе timestamp событий |

Дополнительно сохранять first agent-run status, число failure attempts, exit code, timeout и usage coverage. Не считать cached tokens повторно при расчёте total. Стоимость в деньгах — только при известном тарифе, отдельно для генератора приложения и Codex.

### 9.2. Диагностические метрики

- Количество tool calls, shell commands, snapshot/discovery calls, screenshots, DOM reads, browser actions и неудачных действий, если доступны в machine-readable логах выбранного tooling. Неизмеримые значения = null.
- Количество реально наблюдаемых LLM calls, если runtime раскрывает их; `turn.completed` не автоматически равен одному запросу модели. Отдельно число turns.
- Context bytes (размер сериализованных snapshot/tool responses), если доступен; не путать с фактическими LLM input tokens.
- Ошибки: locator missing/ambiguous, actionability, sync/timeout, wrong frame, assertion, compilation, application generation, app defect, infrastructure, protocol violation, unknown. Сохранять raw evidence; неоднозначная классификация помечается.
- Длина теста (bytes/LOC), число assertions, использование hard-coded sleeps, виды локаторов (`id`, role/name, text, CSS, XPath, positional), число frames.
- Отдельный UI audit: доля интерактивных элементов с accessible name, duplicate IDs, dangling IDREF, наличие labels у полей, критические axe violations, размер snapshot в bytes. Audit одинаков на всех ревизиях; не передавать его результаты benchmark agent.
- `generationInputTokens`, `generationOutputTokens`, `generationWallMs` — метрики внутренней AI-генерации JS2Go в live mode, не складывать с Codex usage.

### 9.3. Проверка качества теста

Grader независим от benchmark agent:

1. Проверить наличие ожидаемого spec, отсутствие skip/only, неподходящих mocks, assertions вида `expect(true)`, прямых вмешательств в state.
2. Запустить первый и финальный candidates на исправном приложении с reset.
3. Проверить C1–C8 по trace/логам и assertions. Где невозможно надёжно автоматизировать семантическую оценку, использовать приватный review checklist; `unverified` не приравнивать к pass. Зафиксировать обоснование.
4. Минимальный negative control: отдельно прогнать неизменённый тест на калькуляторе, в котором сложение возвращает неверный результат для 12+8, и на калькуляторе с неверным умножением для 6×7. Мутации меняют только вычисление, а не интерфейс. Ожидается падение соответствующего assertion в каждом случае. Неверный результат не должен быть известен агенту. Инфраструктурная ошибка не считается обнаружением мутации. Контроль проводить как минимум для финального валидного кандидата; для строгого first-pass validity — также для первого прошедшего кандидата.

Это не отдельный mutation-testing framework; достаточно двух простых контролируемых дефектов fixture. Хранить `addMutationKilled`, `multiplyMutationKilled` и доказательства. В отчёте отдельно raw replay pass и strict validity.

## 10. Повторения и методика сравнения

- Smoke: 1–2 неучитываемые попытки на R0, проверка harness. Не подбирать prompt на результатах основной серии.
- Pilot: 5 независимых trials на ревизию. Основная серия: 10 trials на ревизию, всего 30; при высоком разбросе расширить до 20+ по заранее заданному решению. Это предложенные значения, не статистическая гарантия.
- Сначала обязательно сохранить исходный R0 baseline до адаптации. После готовности R1/R2 желательно выполнить сравнительную серию с чередованием ревизий в seeded randomized order, используя сохранённые checkout/fixtures. Это уменьшает влияние нагрузки, изменений provider и cache. Начальные R0 trials и повторную сравнительную серию не смешивать без маркировки.
- Каждый trial свежий контекст Codex, одинаковый bриф, одинаковый browser tooling, модель и budgets. Provider-side prompt cache может сохраняться между независимыми сессиями; учитывать cached tokens и порядок, не утверждать гарантированно cold cache.
- Сравнение R0→R1 и R1→R2: абсолютное и относительное изменение времени/токенов, изменение доли успехов в процентных пунктах, распределения ошибок. Не делать причинный вывод о каждом отдельном атрибуте R2, поскольку он вводится пакетом.
- Отчёт включает N, pass/total, median, p90 (указать метод), min/max, missing count. Время до валидного теста среди успешных показывать вместе с success rate; timeout/failure показывать отдельно, не выкидывать. При достаточной выборке добавить Wilson intervals для долей и bootstrap CI для разницы медиан; при малой выборке явно отметить неопределённость.
- Отдельно исследовать host vs generated UI можно будущим факторным экспериментом (host-only, calculator-only, both). В текущих R1/R2 улучшения применяются к обоим одновременно, поэтому вклад каждого отдельно не идентифицируется.

## 11. Структура реализации

Предлагаемая структура внутри репозитория (можно адаптировать к существующим соглашениям):

```text
experiments/agent-testability/
  README.md
  spec.md
  briefs/calc-01.md
  harness/
    run.mjs
    run-test.mjs
    codex-events.mjs
    metrics.mjs
    grade.mjs
    reset.mjs
    report.mjs
  playwright.config.ts
  templates/                # общий пустой шаблон теста, видимый агенту
  reference/                # приватные контрольные тесты
  fixtures/                 # приватные recorded streams + calculator variants
  configs/experiment.json   # закреплённые параметры и hashes ревизий
  artifacts/                # gitignored; хранить вне доступа benchmark agent
```

Node.js scripts, без Python. Не создавать monorepo или сервис. Фактические attempts запускать в отдельных временных workspace, а не внутри каталога с reference и fixtures. Изолировать доступ средствами sandbox/контейнера, а не только просьбой в prompt. Не коммитить секреты, сырые логи с credentials, browser storageState или большие traces. Сохранять очищенные агрегаты и config/hash для воспроизводимости. Versioned fixture без секретов можно коммитить.

Предлагаемые npm scripts (новые, не утверждение об уже существующих):

```bash
npm run agent:smoke -- --revision R0
npm run agent:benchmark -- --revision R0 --trials 10 --mode recorded
npm run agent:benchmark -- --revision R1 --trials 10 --mode recorded
npm run agent:benchmark -- --revision R2 --trials 10 --mode recorded
npm run agent:report
```

Runner проверяет выбранный commit/fixture/config перед запуском, не переключает ветку с незакоммиченными пользовательскими изменениями. Использовать отдельные worktrees при необходимости.

### 11.1. Артефакты trial

```text
artifacts/<experiment-id>/<revision>/<trial-id>/
  run.json
  codex.jsonl
  codex.stderr.log
  tool-events.jsonl          # если доступно
  candidates/001.spec.ts
  candidates/002.spec.ts
  executions/<attempt>/playwright.json
  executions/<attempt>/trace.zip
  replays/first/...
  replays/final/...
  mutations/...
  grade.json
  metrics.json
```

`run.json` содержит revision, source SHA, fixture hash, prompt hash, harness hash, model/effort, версии инструментов, startedAt, duration, outcome, order index и budgets. Для событий — timestamp, type, trialId, attemptId и raw reference. JSON schema версионировать. Запись атомарна либо восстанавливаема из raw logs при прерывании.

Пример `metrics.json` (условный, не результаты):

```json
{
  "schemaVersion": 1,
  "revision": "R0",
  "mode": "recorded",
  "trialId": "trial-001",
  "outcome": "completed",
  "firstCandidatePass": false,
  "finalCandidatePass": true,
  "agentWallMs": 120000,
  "timeToValidTestMs": 105000,
  "inputTokens": 18000,
  "cachedInputTokens": 9000,
  "outputTokens": 3200,
  "testLaunches": 2,
  "repairIterations": 1,
  "unchangedReruns": 0,
  "runnerRetries": 0,
  "discoveryCalls": null,
  "generationWaitMs": 2000,
  "addMutationKilled": true,
  "multiplyMutationKilled": true
}
```

## 12. Отчёт

Сгенерировать `summary.json`, `comparison.csv`, `report.md` (HTML необязателен). Отчёт автоматически строится из артефактов, а не из текста Codex.

| Метрика | R0 | R1 | R2 | Δ R0→R1 | Δ R1→R2 |
|---|---:|---:|---:|---:|---:|
| Trials / infrastructure failures | — | — | — | — | — |
| Raw first replay pass | — | — | — | — | — |
| Valid first-pass rate (strict) | — | — | — | — | — |
| Final valid rate | — | — | — | — | — |
| Median agent time | — | — | — | — | — |
| p90 agent time | — | — | — | — | — |
| Median input/output tokens | — | — | — | — | — |
| Cached input proportion | — | — | — | — | — |
| Median discovery calls | — | — | — | — | — |
| Median repair iterations | — | — | — | — | — |
| Locator/sync failures | — | — | — | — | — |
| Mutation detection | — | — | — | — | — |

Формула strict VFPR = число попыток с валидным первым candidate / все начатые trials × 100%. Отдельно показать sensitivity analysis без подтверждённых внешних инфраструктурных сбоев, но основной denominator не менять задним числом. Не исключать timeout, нарушения протокола, ошибки агента и отсутствие теста. Отдельно перечислить недоступные метрики, причины и количество случаев.

Отчёт должен отвечать: что именно улучшилось; на каких checkpoints; как изменились locator strategy, число лишних исследований и ожиданий; уменьшилось ли время агента независимо от времени генерации; какие улучшения HTML наиболее перспективны; какие ошибки не устраняются HTML-семантикой.

## 13. План реализации для Codex (вертикальные задачи)

Каждую задачу выполнять в отдельной свежей implementation session. Предыдущий результат доступен через код и docs, но измеряемый benchmark agent всегда изолирован.

### Task 1. Baseline end-to-end

Реализовать локальное тестовое окружение, записать ответ генератора, reference CALC-01 и проверить полный сценарий через UI. Зафиксировать R0 source и fixtures.

Acceptance: чистый старт, reset, успешный контрольный тест с результатами 20 и 42; непустой исходный код, реальный Apply/Run; документированы команды и необходимые env variables; никакой семантической адаптации.

### Task 2. Benchmark R0 end-to-end

Реализовать Codex runner, неизменяемые кандидаты, Playwright execution/replay, grading, metrics parser и базовый отчёт. Выполнить smoke и заморозить параметры. Запустить R0 pilot/основную серию согласно утверждённому бюджету.

Acceptance: автоматизированный полный цикл brief→fresh Codex→candidate→replay→metrics→report; сохранены и успешные, и неудачные runs; метрики сверены с raw events; R0 зафиксирован до изменений продукта.

### Task 3. R1 end-to-end

Адаптировать IDs host и калькулятора, подготовить генераторную инструкцию и fixture, проверить reference и обычные тесты. Заморозить R1 и выполнить тот же benchmark.

Acceptance: уникальные стабильные IDs, отсутствие изменений функциональности и добавленной специально для R1 ARIA-семантики; отчёт R0/R1 из одинакового harness.

### Task 4. R2 end-to-end

Адаптировать native HTML, accessibility, связи, состояния и feedback host и калькулятора. Проверить reference/обычные тесты и snapshots. Заморозить R2 и выполнить benchmark.

Acceptance: R1 IDs сохранены, meaningful controls именованы, состояния соответствуют реальному lifecycle, проверены формы/коллекции/iframe, нет необоснованных ARIA; отчёт всех трёх ревизий.

### Task 5. Comparative report

При наличии бюджета выполнить чередующуюся сравнительную серию и дополнительную live серию. Сформировать итоговый отчёт с raw metrics, диаграммами по желанию, ограничениями и рекомендациями для будущего lint/skill.

Acceptance: выводы основаны на измерениях, не на ожидаемых цифрах; доступны hashes, результаты, причины failures и инструкции воспроизведения. Никакого нового агентного DSL/линтера/skill в рамках задачи.

## 14. Definition of Done

- JS2Go запускается локально, reference CALC-01 работает во всех трёх ревизиях.
- Три закреплённых ревизии, одинаковый бриф и воспроизводимая основная серия с фиксированным ответом генератора.
- Codex самостоятельно создаёт Playwright tests в чистом контексте, runner сохраняет результаты независимо от успеха.
- First candidate и final candidate независимо проверены; отрицательные контроли отделяют содержательные тесты от формально зелёных.
- Измеряются время, usage токенов (если предоставлен), ретраи/исправления и диагностические метрики с честными null при недоступности.
- Есть сравнительный отчёт с инструкцией запуска и описанием неопределённости. Успешность эксперимента не требует, чтобы R2 выиграла: отсутствие эффекта тоже валидный результат.

## 15. Ссылки

- JS2Go repository: https://github.com/mikhail-angelov/playground
- Playwright configuration: https://playwright.dev/docs/test-configuration
- Playwright retries: https://playwright.dev/docs/test-retries
- Playwright reporters: https://playwright.dev/docs/test-reporters
- Playwright tracing: https://playwright.dev/docs/api/class-testoptions
- Playwright ARIA snapshots: https://playwright.dev/docs/aria-snapshots
- Playwright locators: https://playwright.dev/docs/locators
- Playwright CLI: https://github.com/microsoft/playwright-cli
- Codex evals and structured logs: https://developers.openai.com/blog/eval-skills
- WAI-ARIA: https://www.w3.org/TR/wai-aria/

## 16. Открытые технические вопросы и принятые решения

- Реальный локальный startup, auth setup, storage reset, путь AI stream и формат usage необходимо подтвердить при реализации: приложение и Codex CLI не запускались при написании спека.
- Использование recorded response — методологическое решение для исключения вариативности генератора; live серия отдельно проверяет реальную генерацию.
- 12+8, 10 trials, Chromium/headless, предложенная схема IDs и лимиты — проектные defaults. Уточнить бюджет и версии на smoke step и заморозить до основной серии.
- Новые стандартные HTML IDs и ARIA могут улучшать разные аспекты одновременно. Эксперимент не изолирует эффект каждого атрибута или host отдельно от generated calculator.
- Browser-level E2E, а не unit tests. Playwright auto-wait внутренние циклы и фактическое количество LLM inference calls могут быть не экспортированы; не придумывать эти числа.
- Этот документ описывает реализацию эксперимента; изменения в репозитории, результаты тестов и измеренные показатели пока отсутствуют.
