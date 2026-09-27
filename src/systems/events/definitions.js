export const DEALS={
 fuse:{name:'Сращивание',description:'−25 максимального HP до конца забега. Урон выбранного оружия ×2. Рука навсегда закрепляется до конца забега.'},
 organs:{name:'Вскрытая полость',description:'−25 максимального HP до конца забега; +1 слот органа.'},
 speed:{name:'Ускоренный метаболизм',description:'−25 максимального HP; +15% к скорости бега до конца забега.'},
 armor:{name:'Броневой имплант',description:'−25 максимального HP; +0,5 пластины брони до конца забега.'},
 capacity:{name:'Усиленный каркас',description:'−25 максимального HP; +20 к максимальной массе до конца забега.'},
};
export const EVENTS={
 altar:{name:'Алтарь сращивания',kind:'altar',deal:'fuse',hint:'Один раз за забег · урон оружия ×2',available:1200,recommended:20},
 altar_organs:{name:'Алтарь органов',kind:'altar',deal:'organs',hint:'−25 макс. HP · +1 слот органа',available:180,recommended:5},
 altar_speed:{name:'Алтарь метаболизма',kind:'altar',deal:'speed',hint:'−25 макс. HP · +15% скорость',available:180,recommended:5},
 altar_armor:{name:'Алтарь брони',kind:'altar',deal:'armor',hint:'−25 макс. HP · +0,5 брони',available:180,recommended:6},
 altar_capacity:{name:'Алтарь каркаса',kind:'altar',deal:'capacity',hint:'−25 макс. HP · +20 макс. масса',available:180,recommended:6},
 sealed:{name:'Запечатанный питомник',kind:'challenge',hint:'45 с и все враги испытания. После входа выхода нет.',available:300,duration:45,radius:11,recommended:6},
 infection:{name:'Заражённый круг',kind:'challenge',hint:'30 с внутри круга. Уклоняйтесь от живучих преследователей; убивать их не обязательно.',available:300,duration:30,radius:11,recommended:7},
 hunt:{name:'Охота на носителя',kind:'challenge',hint:'Убейте отмеченную элиту за 60 с. При провале награда исчезнет.',available:300,duration:60,radius:7,recommended:8},
 race:{name:'Дальний рывок',kind:'challenge',hint:'Доберитесь до дальней стороны карты до конца отсчёта. Испытание для быстрых сборок.',available:300,radius:3,recommended:8,survivalOnly:true},
 dungeon_roots:{name:'Главный Отсек',kind:'challenge',dungeon:true,theme:'roots',hint:'С уровня 10 · 12 элит с ×3 HP и скоростью атаки · усиленная добыча.',available:900,radius:3,recommended:10,survivalOnly:true},
 dungeon_catacombs:{name:'Техногенные катакомбы',kind:'challenge',dungeon:true,theme:'catacombs',hint:'С уровня 17 · 18 элит с ×3 HP и скоростью атаки · усиленная добыча.',available:1500,radius:3,recommended:17,survivalOnly:true},
};
