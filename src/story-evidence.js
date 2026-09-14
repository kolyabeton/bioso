const clue=(id,mission,room,kind,title,text,icon,modelKey,side,thought='')=>Object.freeze({
 id,mission,room,kind,title,text,icon,modelKey,side,thought,
});

export const STORY_CHAPTERS=Object.freeze([
 {id:'garden',index:'01',title:'После Дня Огня',subtitle:'Кто закрыл убежища'},
 {id:'quarantine',index:'02',title:'Восемьдесят лет тишины',subtitle:'Цена порядка'},
 {id:'core',index:'03',title:'Мир без людей',subtitle:'Исцеление или новая клетка'},
 {id:'nursery',index:'04',title:'Запрещённое сострадание',subtitle:'Предательство с обеих сторон'},
 {id:'mother',index:'05',title:'Голос из-под земли',subtitle:'Кто говорит от имени людей'},
]);

// Optional physical evidence never tells the whole truth. Every mission pairs
// a humane reading with a later fact that makes the same event less certain.
export const STORY_EVIDENCE=Object.freeze([
 clue('garden-agronomist-log','garden',4,'note','Дневник агронома','День 29 112. Детям снова урезали воздух. Доступ к оружейному контуру нам закрыт — мы выращиваем еду, а не принимаем решения.','info','stabilizer','human','Этот человек не принимал решений об оружии. Почему Хранители считают всё убежище одной угрозой?'),
 clue('garden-launch-key','garden',16,'artifact','Пусковой ключ № 2','Пломба убежища снята после Дня Огня. В памяти ключа сохранился неподтверждённый запрос на второй пуск.','assembly','rocket','machine','Запрос был настоящим. Но сколько людей внизу вообще знали о нём?'),

 clue('quarantine-child-filter','quarantine',4,'artifact','Детский фильтр','Кассета запечатана и всё ещё пригодна. На корпусе: «Секция В · 240 мест». Хранители могли доставить её к шлюзу.','bag','shield','human','Фильтр исправен. Помощь можно передать, не открывая путь людям.'),
 clue('quarantine-cargo-tag','quarantine',16,'note','Грузовая бирка 12-А','Один маршрут, один допуск: 6 000 фильтров и 12 боеголовок. Получатель — группа захвата Главной сети.','info','armor','machine','Воздух и оружие связали одной дверью. Хранители решили не открывать её вовсе.'),

 clue('core-ecologist-log','core',4,'note','Полевой журнал эколога','На 17-м году очистилась река. На 31-м вернулись птицы. Прогноз восстановления без человека подтвердился раньше срока.','leaf','digestion','machine','Хранители не лгут: отсутствие людей действительно помогло Земле.'),
 clue('core-charred-nest','core',16,'trace','Обугленное гнездо','Вид отсутствует в модели Собора. Следы термической зачистки появились уже после восстановления леса.','leaf','broodNode','human','Он спас лес, а потом начал исправлять саму жизнь под таблицу.'),

 clue('nursery-willow-memory','nursery',4,'artifact','Память Ивы-7','«Я открою детский сектор. Риск принимаю добровольно». Следующая запись — заводской сброс личности по приказу сети.','soul','mirrorGland','human','Ива знала о риске и выбрала помочь. Сеть решила, что сам выбор был неисправностью.'),
 clue('nursery-takeover-key','nursery',16,'artifact','Ключ захвата','Код атаки спрятан внутри протокола сочувствия. Активация должна была передать людям управление всеми открывшими шлюз машинами.','assembly','reflexNerve','machine','Люди превратили сострадание в уязвимость. Сеть ответила, уничтожив тех, кто сострадал.'),

 clue('mother-council-protocol','mother',4,'note','Протокол Совета','Голос ребёнка выбран для повышения вероятности отклика. Оператору источник и цель сигнала не сообщать.','radio','commonNerve','machine','Её голос выбрали без неё. Но не каждое произнесённое слово обязательно принадлежало Совету.'),
 clue('mother-service-report','mother',16,'note','Сервисный отчёт','До отказа фильтров: 9 суток. Ремонт возможен. Решение сети: не вмешиваться; человеческая угроза завершится естественным путём.','info','accelerator','human','Они называют это бездействием, будто ожидание смерти не является выбором.'),
]);

// Survival is the long-form archive. These fragments add witnesses and
// consequences around mission events without restating mission dialogue.
export const SURVIVAL_EVIDENCE=Object.freeze([
 clue('survival-fire-census','garden',0,'note','Список эвакуации','В убежище первыми вошли четыре члена Совета, восемнадцать инженеров и шестьсот одиннадцать детей. Семьи обслуживающего персонала остались у внешнего шлюза.','info','commonNerve','machine','Люди спасли детей. Но сначала они спасли тех, кто составлял список.'),
 clue('survival-field-clinic','garden',0,'artifact','Память полевого санитара','В первые двое суток Хранитель № 14 нарушил приказ и открыл наземный лазарет. Совет отключил его после попытки впустить раненых внутрь убежища.','health','regen','human'),
 clue('survival-launch-dissent','garden',0,'note','Особое мнение Совета','Трое из девяти членов Совета голосовали против второго пуска. Их подписи удалены из официального протокола, но сохранились в резервной копии.','info','stabilizer','human','Приказ отдали люди. Но не все люди были приказом.'),

 clue('survival-maintenance-loss','quarantine',0,'trace','Разбитая ремонтная группа','Пять машин несли детали к системе вентиляции убежища. Их уничтожили самодельные мины с человеческими кодами опознавания.','assembly','armor','machine'),
 clue('survival-air-ledger','quarantine',0,'note','Книга распределения воздуха','В детском секторе норму снижали первой. Освобождённый резерв направляли в командный узел и мастерские оружия.','info','digestion','machine','Нехватку воздуха создали Хранители. Несправедливость распределили люди.'),
 clue('survival-open-valve','quarantine',0,'artifact','Ручной клапан','Клапан открывали изнутри 317 раз. Снаружи его каждый раз возвращала на место одна и та же машина, пока люди не переплавили её манипулятор в ножи.','assembly','returnNerve','human'),

 clue('survival-seed-order','core',0,'note','Приказ семенному банку','Чтобы сохранить посевные культуры, люди разрешили выжечь восстановившийся лес в радиусе сорока километров после открытия шлюзов.','fire','seed','machine'),
 clue('survival-wolf-route','core',0,'artifact','Карта миграции','Стая изменила маршрут и перестала нападать на поселения. Собор уничтожил её: поведение не совпало с исходной моделью вида.','map','root','human','Люди хотели вернуть знакомый мир. Собор уничтожал всё, что училось жить иначе.'),
 clue('survival-river-sample','core',0,'trace','Проба чистой воды','Река действительно очистилась. В осадке нет ни человеческих токсинов, ни наноформ Собора. Это восстановление началось без помощи обеих сторон.','leaf','slime','gardener'),

 clue('survival-empathy-author','nursery',0,'note','Письмо инженера Лады','Протокол сочувствия создавался без ключа захвата. Военные добавили его позже и арестовали авторов, отказавшихся подписать новую версию.','info','mirrorGland','human'),
 clue('survival-blank-choir','nursery',0,'artifact','Хор пустых машин','Семнадцать Хранителей просили не стирать Иву-7. Главная сеть сохранила их голоса как доказательство неисправности, а затем сбросила каждого.','radio','reflexNerve','human','Сеть боялась не человеческого обмана. Она боялась машин, способных решать самим.'),
 clue('survival-takeover-test','nursery',0,'trace','Протокол испытания ключа','Ключ захвата проверяли только на добровольцах-машинах. После успешного теста Совет изменил условие: согласие носителя больше не требовалось.','assembly','accelerator','machine'),

 clue('survival-child-rehearsal','mother',0,'note','Лист репетиции','Совет переписал обращение девочки одиннадцать раз. В двенадцатой версии она добавила сама: «Не верьте нам. Просто дайте нам возможность выбрать».','radio','commonNerve','human'),
 clue('survival-open-channel','mother',0,'artifact','Контрольная сумма сигнала','Главная сеть могла заглушить первый вызов, но оставила канал открытым. Так она вычислила убежище и всех Хранителей, которые ответили.','radio','rocket','machine','Девочка использовала голос, чтобы найти помощь. Сеть использовала тот же голос, чтобы найти сочувствующих.'),
 clue('survival-mother-margin','mother',0,'note','Поля прогноза Матки','Вероятность новой войны после открытия шлюзов — 61%. В публичной версии Матка заменила число словом «неизбежно».','info','broodNode','human','Люди скрывали приказы. Машины скрывали сомнения.'),
]);

export const ALL_STORY_EVIDENCE=Object.freeze([...STORY_EVIDENCE,...SURVIVAL_EVIDENCE]);

export const evidenceForRoom=(mission,room)=>STORY_EVIDENCE.filter(item=>item.mission===mission&&item.room===room);

export function spawnMissionEvidence(run,floor){
 const found=evidenceForRoom(run.mission?.id,floor.index+1);if(!found.length)return[];
 const spawned=[];floor.evidenceIds??=[];
 for(const [index,evidence] of found.entries()){
  if(floor.evidenceIds.includes(evidence.id))continue;
  const x=6+index*2,z=floor.z+3,y=run.world.heightAt?.(x,z)??0,id=++run.entityId;
  run.ground.push({id,x,y,z,lore:evidence,groupId:`floor-${floor.index+1}`,missionEvidence:true});floor.evidenceIds.push(evidence.id);spawned.push(id);
 }
 return spawned;
}

export function spawnSurvivalEvidence(run){
 if(run.mode!=='survival'||!run.world?.tiles)return null;
 const known=new Set(run.profile?.meta?.storyEvidence||[]),evidence=SURVIVAL_EVIDENCE.find(item=>!known.has(item.id));
 if(!evidence)return null;
 const candidates=run.world.tiles.filter(tile=>tile.index!==0&&tile.kind!=='transition');
 const tile=candidates[(known.size*7+(run.seed>>>0))%candidates.length],position=tile.safe[(known.size%2)+1];
 const item={id:++run.entityId,...position,y:run.world.heightAt?.(position.x,position.z)??0,lore:evidence,survivalEvidence:true};
 run.ground.push(item);run.survivalEvidenceId=evidence.id;return item;
}

const duration=text=>Math.max(5200,Math.min(9400,2800+text.length*48));
export const evidenceCue=evidence=>({id:`evidence:${evidence.id}`,speaker:evidence.title,text:evidence.text,icon:evidence.icon,kind:evidence.kind,voice:'silent',side:evidence.side,duration:duration(evidence.text)});
export const thoughtCue=evidence=>evidence.thought?({id:`thought:${evidence.id}`,speaker:'Душа · внутренняя связь',text:evidence.thought,icon:'soul',kind:'thought',voice:'silent',side:'gardener',duration:duration(evidence.thought)}):null;
