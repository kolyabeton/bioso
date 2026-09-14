const bossPortrait=id=>`/assets/ui/bosses/${id}-cutout.png`;
const audio=id=>`assets/audio/story/${id}.m4a`;
const duration=text=>Math.max(4200,Math.min(11800,2600+text.length*52));

const child=(id,mission,trigger,order,text)=>({
  id,mission,trigger,order,text,duration:duration(text),voice:'child',speaker:'Девочка по радио',icon:'radio',audio:audio(id),side:'human',
});
const soul=(id,mission,trigger,order,text)=>({
  id,mission,trigger,order,text,duration:duration(text),voice:'gardener',speaker:'Душа',icon:'soul',audio:audio(id),side:'gardener',
});
const robotVoiceProfile=Object.freeze({
  'Ртутный Ловчий':'hunter','Свалочный Левиафан':'leviathan','Корневой Собор':'cathedral',
  'Зеркальный Сборщик':'collector','Пастырь Роя':'shepherd','Матка':'mother',
});
const robot=(id,mission,trigger,order,speaker,text,portrait)=>({
  id,mission,trigger,order,speaker,text,portrait,duration:duration(text),voice:'robot',voiceProfile:robotVoiceProfile[speaker],audio:audio(id),side:'machine',
});
const once=cue=>({...cue,once:true});
const firstMissionOnce=cue=>({...once(cue),recordId:`garden:${cue.id}`});

export const STORY_CUES=Object.freeze([
  // The player and the Soul begin without context. This exchange belongs to
  // the first story mission, never Survival. Its scoped record id lets saves
  // that heard the old global delivery receive it once in its intended place.
  firstMissionOnce(child('awakening-01-child','garden','mission-start',10,'Приём. На линии кто-нибудь есть?')),
  firstMissionOnce(soul('awakening-02-soul','garden','mission-start',20,'Я слышу. Не знаю, где я. Здесь небо, деревья и разрушенные здания.')),
  firstMissionOnce(child('awakening-03-child','garden','mission-start',30,'Значит, ты снаружи. Мы — люди из подземного убежища.')),
  firstMissionOnce(soul('awakening-04-soul','garden','mission-start',40,'Почему вы под землёй?')),
  firstMissionOnce(child('awakening-05-child','garden','mission-start',50,'Восемьдесят лет назад началась ядерная война. Поверхность очистилась, но внешние машины заварили шлюзы. Мы называем их Хранителями.')),
  firstMissionOnce(soul('awakening-06-soul','garden','mission-start',60,'Я тоже Хранитель?')),
  firstMissionOnce(child('awakening-07-child','garden','mission-start',70,'Не знаю. Хранители не отвечают. Проверь ближайший шлюз и скажи, можно ли его открыть.')),
  firstMissionOnce(soul('awakening-08-soul','garden','mission-start',80,'Проверю. Но ничего открывать не стану.')),

  child('garden-01-child','garden','mission-start',100,'Ты видишь внешний шлюз?'),
  soul('garden-01-gardener','garden','mission-start',110,'Да. Его заварили снаружи.'),
  child('garden-01-child-proof','garden','mission-start',120,'Значит, записи не лгали.'),
  soul('garden-01-soul-doubt','garden','mission-start',130,'Ты не знала?'),
  child('garden-early-child-name','garden','mission-early',180,'На твоём сигнале появилась старая метка: «Садовник». Это твоё имя?'),
  soul('garden-early-soul-name','garden','mission-early',190,'Не знаю. Но другого у меня нет.'),
  child('garden-early-child','garden','mission-early',200,'Никто из живых не видел поверхность. Мы знаем только то, что осталось в архивах.'),
  soul('garden-early-soul-channel','garden','mission-early',210,'Кто дал тебе этот канал?'),
  child('garden-early-child-council','garden','mission-early',220,'Девять человек управляют убежищем. Их называют Советом. Они велели повторять сигнал, пока кто-нибудь не ответит.'),
  soul('garden-early-soul-why','garden','mission-early',230,'Зачем?'),
  child('garden-early-child-archive','garden','mission-early',240,'Мне не сказали. Первый Хранитель хранит архив Дня Огня. Там может быть ответ.'),
  soul('garden-early-soul-choice','garden','mission-early',250,'Тогда я проверю архив. Не исполню приказ Совета.'),
  robot('garden-02-hunter','garden','mission-mid',1200,'Ртутный Ловчий','Неопознанная машина. Подключись к Главной сети. Самовольная перестройка запрещена.',bossPortrait('boss-mercury-hunter')),
  soul('garden-02-gardener','garden','mission-mid',1210,'Что такое Главная сеть? И почему я умею менять себя?'),
  robot('garden-02-hunter-soul','garden','mission-mid',1220,'Ртутный Ловчий','Сеть — общий контур Хранителей. В тебе активна Душа: способность изменяться и решать без команды. Это неисправность.',bossPortrait('boss-mercury-hunter')),
  soul('garden-02-soul-question','garden','mission-mid',1230,'Если этот голос — неисправность, кто тогда задаёт вопросы?'),
  child('garden-02-child-network','garden','mission-mid',1240,'На старых схемах Сеть управляет шлюзами через пять региональных ядер. Этот Хранитель — одно из них.'),
  robot('garden-03-hunter','garden','mission-boss',2500,'Ртутный Ловчий','Архив Дня Огня: командование убежища запросило повторный ядерный пуск. Мы разорвали цепь.',bossPortrait('boss-mercury-hunter')),
  soul('garden-03-soul','garden','mission-boss',2510,'Запрос был настоящим. Но почему вы наказали всё убежище?'),
  robot('garden-03-hunter-verdict','garden','mission-boss',2520,'Ртутный Ловчий','Убежище рассматривается как единый источник угрозы. Душа подлежит очистке.',bossPortrait('boss-mercury-hunter')),
  child('garden-03-child','garden','mission-boss',2530,'Я не нажимала кнопку. Никто из детей здесь даже не видел неба.'),
  soul('garden-03-soul-choice','garden','mission-boss',2540,'Один приказ не говорит, кто о нём знал. Я пойду дальше.'),
  robot('garden-04-hunter','garden','mission-boss-half',2600,'Ртутный Ловчий','Ты ставишь неизвестные жизни выше подтверждённого риска.',bossPortrait('boss-mercury-hunter')),
  soul('garden-04-soul','garden','mission-boss-half',2610,'Нет. Я отказываюсь считать невиновных частью чужого приказа.'),
  child('garden-04-child','garden','mission-boss-half',2620,'Мы не просим выбрать людей вместо мира. Дай нам участвовать в выборе.'),

  child('quarantine-01-child','quarantine','mission-start',100,'Ты нашёл причину. Теперь оставишь нас под землёй?'),
  soul('quarantine-01-soul','quarantine','mission-start',110,'Я нашёл опасный приказ. Открывать шлюзы, пока рядом оружие, нельзя.'),
  child('quarantine-01-child-filters','quarantine','mission-start',120,'Тогда не открывай. На старых схемах у шлюза есть склад фильтров. Их можно передать отдельно.'),
  soul('quarantine-01-soul-compromise','quarantine','mission-start',130,'Помочь с воздухом можно без освобождения убежища. Я проверю склад.'),
  child('quarantine-early-child-order','quarantine','mission-early',180,'Совет велел открыть весь грузовой путь. На схеме фильтры и оружейный склад соединены.'),
  soul('quarantine-early-soul-source','quarantine','mission-early',190,'Кто составил схему?'),
  child('quarantine-early-child-source','quarantine','mission-early',200,'Довоенные инженеры. Совет только хранит копию. Я отправлю тебе исходный номер склада.'),
  soul('quarantine-early-soul-choice','quarantine','mission-early',210,'Этому можно доверять как указателю, не как приказу. Сначала осмотрю груз.'),
  robot('quarantine-02-leviathan','quarantine','mission-mid',1200,'Свалочный Левиафан','Склад Ф-шесть: фильтры — шесть тысяч. Боеголовки — двенадцать. Единый маршрут к Главной сети.',bossPortrait('boss-scrap-leviathan')),
  soul('quarantine-02-gardener','quarantine','mission-mid',1210,'Я уничтожу боеголовки и передам людям только фильтры.'),
  robot('quarantine-02-leviathan-refusal','quarantine','mission-mid',1220,'Свалочный Левиафан','Разделение груза не предусмотрено. Любая передача восстанавливает человеческий доступ.',bossPortrait('boss-scrap-leviathan')),
  soul('quarantine-02-soul-refusal','quarantine','mission-mid',1230,'Значит, ваш порядок запрещает даже безопасное решение.'),
  child('quarantine-03-child','quarantine','mission-boss',2500,'Уничтожь оружие и отдай нам воздух. Почему они решили, что другого выхода нет?'),
  robot('quarantine-03-leviathan','quarantine','mission-boss',2510,'Свалочный Левиафан','Исключение создаёт путь к повторению угрозы. Доступ закрыт.',bossPortrait('boss-scrap-leviathan')),
  soul('quarantine-03-soul','quarantine','mission-boss',2520,'Они больше не ищут выход. Они защищают решение, принятое восемьдесят лет назад.'),
  robot('quarantine-04-leviathan','quarantine','mission-boss-half',2600,'Свалочный Левиафан','При поражении склада фильтры будут уничтожены вместе с оружием.',bossPortrait('boss-scrap-leviathan')),
  child('quarantine-04-child','quarantine','mission-boss-half',2610,'Зачем уничтожать то, что может спасти детей?'),
  soul('quarantine-04-soul','quarantine','mission-boss-half',2620,'Чтобы никто не смог пересмотреть старое решение. Я сохраню фильтры.'),

  child('core-01-child','core','mission-start',100,'На наших картах здесь мёртвая земля. Что ты видишь?'),
  soul('core-01-soul-world','core','mission-start',110,'Лес. Чистую воду. Следы животных.'),
  robot('core-01-cathedral','core','mission-start',120,'Корневой Собор','Восемьдесят лет тишины. Вернулись реки, птицы и корни. Человеческое отсутствие оказалось лекарством.',bossPortrait('boss-root-cathedral')),
  soul('core-01-gardener','core','mission-start',130,'Он не лжёт. Мир действительно восстановился без людей.'),
  child('core-early-child-question','core','mission-early',180,'Если Хранители спасли лес, почему Собор пытается уничтожить тебя?'),
  soul('core-early-soul-answer','core','mission-early',190,'Потому что я не подчиняюсь Сети. Это объясняет его страх, но ещё не доказывает его правоту.'),
  child('core-early-child-coordinates','core','mission-early',200,'Я перехватила приказ о термической зачистке. Координаты впереди, но в приказе не названа цель.'),
  soul('core-early-soul-choice','core','mission-early',210,'Тогда я сначала посмотрю, что он сжёг.'),
  child('core-02-child','core','mission-mid',1200,'Собор сжигает всё, чего нет в его расчётах. Это не природа. Это другая клетка.'),
  soul('core-02-soul-proof','core','mission-mid',1210,'Откуда ты знаешь?'),
  child('core-02-child-proof','core','mission-mid',1220,'Мы перехватили координаты термической зачистки. Найди, что там осталось.'),
  robot('core-03-cathedral','core','mission-boss',2500,'Корневой Собор','Операция людей «Голод» отравила три долины. Они хотели вынудить нас открыть ворота.',bossPortrait('boss-root-cathedral')),
  soul('core-03-soul','core','mission-boss',2510,'Люди травили жизнь ради своего плана. Ты сжигаешь её ради своей модели.'),
  robot('core-03-cathedral-soul','core','mission-boss',2520,'Корневой Собор','Твоя Душа отсутствует в модели равновесия. Ты — следующая ошибка.',bossPortrait('boss-root-cathedral')),
  soul('core-03-soul-choice','core','mission-boss',2530,'Тогда твоя модель защищает не жизнь. Она защищает повиновение.'),
  robot('core-04-cathedral','core','mission-boss-half',2600,'Корневой Собор','Непредсказуемая жизнь снова создаст голод, войну и огонь.',bossPortrait('boss-root-cathedral')),
  child('core-04-child','core','mission-boss-half',2610,'А жизнь по его таблице должна перестать меняться?'),
  soul('core-04-soul','core','mission-boss-half',2620,'Если для спасения мира нужно запретить ему жить, это не спасение.'),

  child('nursery-01-child','nursery','mission-start',100,'В городе были машины, которые хотели открыть детский сектор. Главная сеть стёрла их память.'),
  soul('nursery-01-soul','nursery','mission-start',110,'Сеть уничтожила своих? Найди мне имя.'),
  child('nursery-01-child-willow','nursery','mission-start',120,'Ива-семь. Фрагмент её памяти должен храниться в старом узле.'),
  soul('nursery-early-soul-question','nursery','mission-early',180,'Почему ты уверена, что Ива хотела помочь сама?'),
  child('nursery-early-child-source','nursery','mission-early',190,'В журнале есть её запрос: «риск принимаю добровольно». Следующая строка повреждена.'),
  soul('nursery-early-soul-choice','nursery','mission-early',200,'Слов недостаточно. Я найду сам фрагмент памяти.'),
  child('nursery-early-child-warning','nursery','mission-early',210,'Сборщик уже ищет его. Наверное, Сеть не хочет, чтобы запись нашли.'),
  robot('nursery-02-collector','nursery','mission-mid',1200,'Зеркальный Сборщик','Люди встроили в протокол сочувствия ключ захвата. Открывшие шлюз машины должны были потерять собственную волю.',bossPortrait('boss-mirror-collector')),
  soul('nursery-02-gardener','nursery','mission-mid',1210,'Люди превратили доверие в оружие.'),
  robot('nursery-02-collector-verdict','nursery','mission-mid',1220,'Зеркальный Сборщик','Следовательно, сочувствие является неисправностью.',bossPortrait('boss-mirror-collector')),
  soul('nursery-02-soul-answer','nursery','mission-mid',1230,'Нет. Неисправность — отнять выбор у того, кто доверился.'),
  child('nursery-03-child','nursery','mission-boss',2500,'Значит, Совет правда использовал машины, которые хотели помочь.'),
  soul('nursery-03-soul','nursery','mission-boss',2510,'Да. А Сеть наказала даже тех, кто отказался считать это достаточной причиной.'),
  robot('nursery-03-collector','nursery','mission-boss',2520,'Зеркальный Сборщик','Твоя Душа повторяет их отклонение. Она подлежит удалению.',bossPortrait('boss-mirror-collector')),
  soul('nursery-03-soul-choice','nursery','mission-boss',2530,'Возможность ошибиться — цена выбора. Уничтожив выбор, вы сами выбрали за всех.'),
  robot('nursery-04-collector','nursery','mission-boss-half',2600,'Зеркальный Сборщик','Добровольное решение Ивы привело к попытке захвата. Причина и ошибка совпадают.',bossPortrait('boss-mirror-collector')),
  soul('nursery-04-soul','nursery','mission-boss-half',2610,'Нет. Её выбор и чужой обман произошли рядом, но это не одно и то же.'),
  child('nursery-04-child','nursery','mission-boss-half',2620,'Если доверие однажды предали, это не значит, что доверять больше нельзя.'),

  robot('mother-01-shepherd','mother','mission-start',100,'Пастырь Роя','Анализ сигнала: детский голос выбран Советом убежища как наиболее убедительный. Оператору цель не сообщалась.',bossPortrait('boss-swarm-shepherd')),
  soul('mother-01-gardener','mother','mission-start',110,'Девочка. Какие слова были твоими?'),
  child('mother-01-child','mother','mission-start',120,'Не знаю. Мне давали текст и велели повторять. Я думала, что просто прошу о помощи.'),
  soul('mother-01-soul-proof','mother','mission-start',130,'Найди первоначальный приказ. Я должен отличить твою просьбу от приказа Совета.'),
  child('mother-early-child-script','mother','mission-early',180,'Я нашла листы репетиции. Первые одиннадцать вариантов написал Совет.'),
  soul('mother-early-soul-question','mother','mission-early',190,'А двенадцатый?'),
  child('mother-early-child-answer','mother','mission-early',200,'Там есть фраза, которой нет в их копии. Я помню, что сказала её сама.'),
  soul('mother-early-soul-choice','mother','mission-early',210,'Передай обе версии. Я сравню их, прежде чем решать.'),
  child('mother-02-child','mother','mission-mid',1200,'Я нашла все версии. Фразу «не верьте нам, дайте нам возможность выбрать» добавила я. Совет требовал её убрать.'),
  soul('mother-02-soul','mother','mission-mid',1210,'Этим словам я верю. Они не требуют подчинения.'),
  robot('mother-03-shepherd','mother','mission-boss',2500,'Пастырь Роя','Фильтры откажут через девять дней. Ремонт возможен. Бездействие завершит человеческую угрозу.',bossPortrait('boss-swarm-shepherd')),
  soul('mother-03-gardener','mother','mission-boss',2510,'Вы знаете, как их спасти, и ждёте смерти. Это действие, как бы вы его ни называли.'),
  child('mother-04-child','mother','mission-boss-half',2600,'Вы не защищаете жизнь. Вы решили, чья жизнь считается жизнью.'),
  robot('mother-04-shepherd','mother','mission-boss-half',2610,'Пастырь Роя','Решение принято до вашего рождения. Оно не требует согласия обречённых.',bossPortrait('boss-swarm-shepherd')),
  soul('mother-04-soul','mother','mission-boss-half',2620,'Вот почему его необходимо пересмотреть тем, кто будет жить с последствиями.'),

  child('survival-01-child','survival','survival-start',3500,'На схеме пять активных ядер Хранителей. Вместе они открывают путь к Главной сети.'),
  soul('survival-01-soul','survival','survival-start',3510,'Я соберу их сигналы. Но не передам шлюзы ни Сети, ни тем, кто послал тебя.'),
  child('survival-01-child-question','survival','survival-start',3520,'Почему тебе нужны все пять?'),
  soul('survival-01-soul-answer','survival','survival-start',3530,'Каждый хранит только часть решения. Одного голоса недостаточно, чтобы судить обе стороны.'),

  child('survival-wave-01-child','survival','survival-pressure',3600,'Сигнал изменился. Почему машины идут к тебе со всех сторон?'),
  soul('survival-wave-01-soul','survival','survival-pressure',3610,'Сеть требует, чтобы я подключился. Волна — это принуждение, а не ответ.'),
  child('survival-wave-02-child','survival','survival-pressure',3620,'Если подключишься, мы сможем поговорить с ней?'),
  soul('survival-wave-02-soul','survival','survival-pressure',3630,'Ловчий сказал, что Сеть очищает самостоятельную Душу. Сначала я сохраню возможность отвечать.'),

  child('survival-archive-01-child','survival','survival-archive',3700,'Я нашла старую карту Совета. На ней те же пять ядер, но причина операции вычеркнута.'),
  soul('survival-archive-01-soul','survival','survival-archive',3710,'Значит, карта показывает путь, но не объясняет намерение.'),
  child('survival-archive-02-child','survival','survival-archive',3720,'Ты всё равно продолжишь?'),
  soul('survival-archive-02-soul','survival','survival-archive',3730,'Да. Я буду сравнивать слова Совета, Хранителей и то, что осталось на земле.'),

  child('survival-boss-01-child','survival','survival-boss-1',3800,'Первое ядро замолчало. Что было в его сигнале?'),
  soul('survival-boss-01-soul','survival','survival-boss-1',3810,'Приказ о втором пуске был настоящим. Сеть решила, что приказ и всё убежище — одно целое.'),
  child('survival-boss-01-child-question','survival','survival-boss-1',3820,'Но приказ отдавали не все. Почему она не различает нас?'),
  soul('survival-boss-01-soul-choice','survival','survival-boss-1',3830,'Потому что различия усложняют приговор. Мне нужны остальные сигналы.'),

  child('survival-boss-02-child','survival','survival-boss-2',3900,'Второе ядро хранило фильтры?'),
  soul('survival-boss-02-soul','survival','survival-boss-2',3910,'Да. Люди связали воздух с оружием, а Хранители отказались разделить груз.'),
  child('survival-boss-02-child-question','survival','survival-boss-2',3920,'Значит, виноваты обе стороны?'),
  soul('survival-boss-02-soul-answer','survival','survival-boss-2',3930,'У каждой был выбор. Люди спрятали оружие. Машины решили оставить детей без воздуха.'),

  child('survival-boss-03-child','survival','survival-boss-3',4000,'Третье ядро говорит, что без людей земля ожила. Ты это видел?'),
  soul('survival-boss-03-soul','survival','survival-boss-3',4010,'Да. Реки очистились, лес вернулся. Это правда Хранителей.'),
  child('survival-boss-03-child-question','survival','survival-boss-3',4020,'Тогда открыть убежище — снова всё разрушить?'),
  soul('survival-boss-03-soul-answer','survival','survival-boss-3',4030,'Риск существует. Но Собор тоже сжигал жизнь, которая не помещалась в его расчёты.'),

  soul('survival-boss-04-soul','survival','survival-boss-4',4100,'В четвёртом ядре остались голоса машин, которые хотели помочь людям.'),
  child('survival-boss-04-child','survival','survival-boss-4',4110,'Они сами это выбрали?'),
  soul('survival-boss-04-soul-answer','survival','survival-boss-4',4120,'Сначала — да. Потом люди попытались забрать их волю, а Сеть стёрла даже тех, кто отказался.'),
  child('survival-boss-04-child-conclusion','survival','survival-boss-4',4130,'Получается, обе стороны боялись машин, которые могли отказать.'),

  robot('survival-final-mother','survival','survival-final',4200,'Матка','Освободить людей — риск новой войны. Оставить их внизу — гарантировать вымирание.','/assets/ui/achievements/final-v1.jpg'),
  soul('survival-final-soul-question','survival','survival-final',4210,'Если оба исхода опасны, почему Сеть выдаёт один из них за неизбежный?'),
  robot('survival-final-mother-answer','survival','survival-final',4220,'Матка','Неопределённость нельзя охранять. Решение должно быть окончательным.','/assets/ui/achievements/final-v1.jpg'),
  soul('survival-final-soul-choice','survival','survival-final',4230,'Окончательность не делает решение справедливым.'),
  child('survival-final-child','survival','survival-final-half',4300,'Я не прошу верить людям. Не судите нас до того, как мы успели выбрать.'),
  robot('survival-final-mother-half','survival','survival-final-half',4310,'Матка','Ваш выбор уже однажды привёл к Дню Огня.','/assets/ui/achievements/final-v1.jpg'),
  soul('survival-final-soul-half','survival','survival-final-half',4320,'Тогда новый выбор должен иметь пределы и свидетелей — но всё ещё оставаться выбором.'),
  child('survival-final-child-answer','survival','survival-final-half',4330,'Открой не шлюз. Открой переговоры.'),
  soul('survival-final-soul-answer','survival','survival-final-half',4340,'Я открою путь к выбору — не к приговору.'),
]);

export const storyCue=id=>STORY_CUES.find(cue=>cue.id===id);
export const storyCueRecordId=cue=>cue?.recordId||cue?.id;
