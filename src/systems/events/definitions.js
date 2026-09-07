export const DEALS={
 fuse:{name:'Сращивание',description:'−1 максимальное здоровье до конца забега. Урон выбранной руки ×2. Нельзя снять до победы над следующим боссом.'},
 organs:{name:'Вскрытая полость',description:'−1 максимальное здоровье до конца забега; +1 слот органа.'},
 speed:{name:'Ускоренный метаболизм',description:'−1 максимальное здоровье; +15% к скорости бега до конца забега.'},
 armor:{name:'Броневой имплант',description:'−1 максимальное здоровье; +0,5 пластины брони до конца забега.'},
 capacity:{name:'Усиленный каркас',description:'−1 максимальное здоровье; +20 к максимальной массе до конца забега.'},
};
export const EVENTS={
 altar:{name:'Алтарь сращивания',kind:'altar',deal:'fuse',hint:'−1 макс. здоровье · урон руки ×2',available:180,recommended:4},
 altar_organs:{name:'Алтарь органов',kind:'altar',deal:'organs',hint:'−1 макс. здоровье · +1 слот органа',available:180,recommended:5},
 altar_speed:{name:'Алтарь метаболизма',kind:'altar',deal:'speed',hint:'−1 макс. здоровье · +15% скорость',available:180,recommended:5},
 altar_armor:{name:'Алтарь брони',kind:'altar',deal:'armor',hint:'−1 макс. здоровье · +0,5 брони',available:180,recommended:6},
 altar_capacity:{name:'Алтарь каркаса',kind:'altar',deal:'capacity',hint:'−1 макс. здоровье · +20 макс. масса',available:180,recommended:6},
 sealed:{name:'Запечатанный питомник',kind:'challenge',hint:'45 с и все враги испытания. После входа выхода нет.',available:300,duration:45,radius:7,recommended:6},
 infection:{name:'Заражённый круг',kind:'challenge',hint:'30 с внутри круга. Уклоняйтесь от живучих преследователей; убивать их не обязательно.',available:300,duration:30,radius:11,recommended:7},
 hunt:{name:'Охота на носителя',kind:'challenge',hint:'Убейте отмеченную элиту за 60 с. При провале награда исчезнет.',available:300,duration:60,radius:7,recommended:8},
};
