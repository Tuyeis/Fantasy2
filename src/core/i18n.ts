// Internationalisation: every visible text is looked up by a stable key.
// Game logic never branches on these strings.

export enum Lang {
    Es = "es",
    En = "en",
    De = "de"
}

export interface LocalizedText {
    es: string;
    en: string;
    de: string;
}

export function L(es: string, en: string, de: string): LocalizedText {
    return {es: es, en: en, de: de};
}

let currentLang: Lang = Lang.Es;

export function setLang(lang: Lang): void {
    currentLang = lang;
    document.documentElement.lang = lang;
}

export function getLang(): Lang {
    return currentLang;
}

/** Resolves a LocalizedText in the active language. */
export function tr(text: LocalizedText): string {
    return text[currentLang];
}

type Triple = [string, string, string];

// Not annotated on purpose: `satisfies` keeps the literal keys so UiKey is checked at compile time.
const UI = {
    // Main menu
    gameTitle: ["Fantasy Game", "Fantasy Game", "Fantasy Game"],
    gameSubtitle: ["Un roguelite de mazmorras", "A dungeon roguelite", "Ein Dungeon-Roguelite"],
    newGame: ["Nueva partida", "New game", "Neues Spiel"],
    continueGame: ["Continuar", "Continue", "Fortsetzen"],
    options: ["Opciones", "Options", "Optionen"],
    credits: ["Créditos", "Credits", "Mitwirkende"],
    confirmNewGame: ["Ya existe una partida guardada. ¿Sobrescribirla?", "A saved game already exists. Overwrite it?", "Es gibt bereits einen Spielstand. Überschreiben?"],
    yes: ["Sí", "Yes", "Ja"],
    no: ["No", "No", "Nein"],
    ok: ["Aceptar", "OK", "OK"],
    close: ["Cerrar", "Close", "Schließen"],
    back: ["Volver", "Back", "Zurück"],
    cancel: ["Cancelar", "Cancel", "Abbrechen"],
    controlsHint: ["WASD: mover · E: entrar · Espacio: impulso · Clic/J: atacar · 1-4: habilidades · I: bolsa · C: personaje · ESC: pausa", "WASD: move · E: enter · Space: dash · Click/J: attack · 1-4: abilities · I: bag · C: character · ESC: pause", "WASD: bewegen · E: betreten · Leertaste: Sprung · Klick/J: angreifen · 1-4: Fähigkeiten · I: Tasche · C: Charakter · ESC: Pause"],

    // Options
    language: ["Idioma", "Language", "Sprache"],
    masterVolume: ["Volumen general", "Master volume", "Gesamtlautstärke"],
    musicVolume: ["Música", "Music", "Musik"],
    sfxVolume: ["Efectos", "Sound effects", "Effekte"],
    fullscreen: ["Pantalla completa", "Fullscreen", "Vollbild"],
    on: ["Activada", "On", "An"],
    off: ["Desactivada", "Off", "Aus"],

    // Pause
    paused: ["Pausa", "Paused", "Pause"],
    resume: ["Continuar", "Resume", "Weiter"],
    inventory: ["Inventario", "Inventory", "Inventar"],
    saveGame: ["Guardar", "Save", "Speichern"],
    saved: ["Partida guardada", "Game saved", "Spiel gespeichert"],
    toMainMenu: ["Guardar y salir al menú", "Save and quit to menu", "Speichern und zum Menü"],
    abandonRun: ["Abandonar expedición", "Abandon run", "Expedition abbrechen"],
    confirmAbandon: ["Si abandonas perderás el botín de esta expedición (conservas la XP). ¿Seguro?", "Abandoning loses this run's loot (you keep XP). Are you sure?", "Beim Abbrechen verlierst du die Beute dieser Expedition (EP bleiben). Sicher?"],

    // HUD
    level: ["Nivel", "Level", "Stufe"],
    lvShort: ["Nv", "Lv", "St"],
    xp: ["XP", "XP", "EP"],
    xpPending: ["XP sin gastar", "Unspent XP", "Unverbrauchte EP"],
    gold: ["Oro", "Gold", "Gold"],
    diamonds: ["Diamantes", "Diamonds", "Diamanten"],
    hp: ["PV", "HP", "LP"],
    mana: ["Maná", "Mana", "Mana"],
    floor: ["Piso", "Floor", "Ebene"],
    rewards: ["Recompensas", "Rewards", "Belohnungen"],
    rewardCapReached: ["Límite de recompensas del piso alcanzado: solo XP", "Floor reward cap reached: XP only", "Belohnungslimit der Ebene erreicht: nur EP"],
    featPoints: ["Puntos de hazaña", "Feat points", "Heldenpunkte"],
    pressToInteract: ["Pulsa E para {name}", "Press E to {name}", "Drücke E: {name}"],
    enter: ["entrar", "enter", "betreten"],
    talk: ["hablar", "talk", "sprechen"],
    locked: ["Bloqueado", "Locked", "Gesperrt"],
    needsBlueprint: ["Este edificio está en ruinas. Encuentra su plano en la mazmorra.", "This building is in ruins. Find its blueprint in the dungeon.", "Dieses Gebäude ist verfallen. Finde seinen Bauplan im Dungeon."],
    companions: ["Compañeros", "Companions", "Gefährten"],
    classLabel: ["Clase", "Class", "Klasse"],

    // Stats
    statHp: ["PV", "HP", "LP"],
    statMana: ["Maná", "Mana", "Mana"],
    statAtk: ["Ataque", "Attack", "Angriff"],
    statDef: ["Defensa", "Defense", "Verteidigung"],
    statMatk: ["Ataque mágico", "Magic attack", "Magieangriff"],
    statMdef: ["Defensa mágica", "Magic defense", "Magieabwehr"],
    statCrit: ["Crítico %", "Critical %", "Kritisch %"],

    // Inventory / equipment
    equipment: ["Equipo", "Equipment", "Ausrüstung"],
    equip: ["Equipar", "Equip", "Ausrüsten"],
    unequip: ["Quitar", "Unequip", "Ablegen"],
    use: ["Usar", "Use", "Benutzen"],
    empty: ["Vacío", "Empty", "Leer"],
    noItems: ["No tienes objetos.", "You have no items.", "Du hast keine Gegenstände."],
    slotWeapon: ["Arma", "Weapon", "Waffe"],
    slotArmor: ["Armadura", "Armor", "Rüstung"],
    slotShield: ["Escudo", "Shield", "Schild"],
    slotHelmet: ["Casco", "Helmet", "Helm"],
    slotBoots: ["Botas", "Boots", "Stiefel"],
    slotAccessory: ["Accesorio", "Accessory", "Accessoire"],
    catPotion: ["Pociones", "Potions", "Tränke"],
    catGear: ["Equipo", "Gear", "Ausrüstung"],
    catMaterial: ["Materiales", "Materials", "Materialien"],
    catSpecial: ["Especiales", "Special", "Besonderes"],
    stats: ["Atributos", "Stats", "Werte"],
    equippedTag: ["(equipado)", "(equipped)", "(ausgerüstet)"],
    cannotUseHere: ["No puedes usar eso ahora.", "You can't use that now.", "Das kannst du jetzt nicht benutzen."],
    usedItem: ["Usas {item}.", "You use {item}.", "Du benutzt {item}."],

    // Shop
    shop: ["Tienda", "Shop", "Laden"],
    shopGreeting: ["¡Bienvenido! Pociones y equipo para aventureros.", "Welcome! Potions and gear for adventurers.", "Willkommen! Tränke und Ausrüstung für Abenteurer."],
    buy: ["Comprar", "Buy", "Kaufen"],
    sell: ["Vender", "Sell", "Verkaufen"],
    price: ["Precio", "Price", "Preis"],
    notEnoughGold: ["No tienes suficiente oro.", "Not enough gold.", "Nicht genug Gold."],
    notEnoughDiamonds: ["No tienes suficientes diamantes.", "Not enough diamonds.", "Nicht genug Diamanten."],
    bought: ["Compraste {item}.", "You bought {item}.", "Du hast {item} gekauft."],
    sold: ["Vendiste {item} por {gold} de oro.", "You sold {item} for {gold} gold.", "Du hast {item} für {gold} Gold verkauft."],
    owned: ["Tienes: {n}", "Owned: {n}", "Besitz: {n}"],
    premium: ["Rincón premium", "Premium corner", "Premium-Ecke"],
    nothingToSell: ["No tienes nada que vender.", "You have nothing to sell.", "Du hast nichts zu verkaufen."],

    // Forge
    forge: ["Forja", "Forge", "Schmiede"],
    forgeGreeting: ["Traigo el metal a la vida. Cada mejora es permanente.", "I bring metal to life. Every upgrade is permanent.", "Ich erwecke Metall zum Leben. Jede Verbesserung ist dauerhaft."],
    upgrade: ["Mejorar", "Upgrade", "Verbessern"],
    maxLevel: ["Nivel máximo", "Max level", "Maximalstufe"],
    upgraded: ["¡{item} mejorado a +{plus}!", "{item} upgraded to +{plus}!", "{item} auf +{plus} verbessert!"],
    missingMaterials: ["Te faltan materiales.", "Missing materials.", "Dir fehlen Materialien."],
    cost: ["Coste", "Cost", "Kosten"],
    noGear: ["No tienes equipo que mejorar.", "You have no gear to upgrade.", "Du hast keine Ausrüstung zum Verbessern."],

    // Guild
    guild: ["Gremio", "Guild", "Gilde"],
    guildGreeting: ["Aquí se forjan los héroes. Convierte tu experiencia en poder.", "Heroes are forged here. Turn your experience into power.", "Hier werden Helden geschmiedet. Mach aus Erfahrung Macht."],
    levelUp: ["Subir de nivel", "Level up", "Stufenaufstieg"],
    levelUpAll: ["Subir todo lo posible", "Level up max", "So weit wie möglich"],
    levelUpDone: ["¡Has alcanzado el nivel {level}!", "You reached level {level}!", "Du hast Stufe {level} erreicht!"],
    xpNeeded: ["Necesitas {xp} XP para el nivel {level}.", "You need {xp} XP for level {level}.", "Du brauchst {xp} EP für Stufe {level}."],
    notEnoughXp: ["No tienes XP suficiente. Gánala en la mazmorra.", "Not enough XP. Earn it in the dungeon.", "Nicht genug EP. Verdiene sie im Dungeon."],
    levelCap: ["Has alcanzado el nivel máximo.", "You reached the level cap.", "Du hast die Maximalstufe erreicht."],
    missions: ["Misiones", "Missions", "Aufträge"],
    claim: ["Cobrar", "Claim", "Einfordern"],
    claimed: ["Cobrada", "Claimed", "Eingefordert"],
    inProgress: ["En curso", "In progress", "Läuft"],
    reward: ["Recompensa", "Reward", "Belohnung"],
    missionClaimed: ["¡Misión cobrada!", "Mission claimed!", "Auftrag eingefordert!"],
    growthPreview: ["Crecimiento por nivel ({cls})", "Growth per level ({cls})", "Zuwachs pro Stufe ({cls})"],

    // Class library
    classLibrary: ["Biblioteca de clases", "Class library", "Klassenbibliothek"],
    classGreeting: ["Un tomo de clase y dos objetos exactos: así nace una nueva senda.", "A class tome and two exact items: that is how a new path is born.", "Ein Klassenfolio und zwei genaue Gegenstände: So entsteht ein neuer Pfad."],
    recipe: ["Receta", "Recipe", "Rezept"],
    transform: ["Transformar", "Transform", "Verwandeln"],
    switchTo: ["Cambiar a esta clase", "Switch to this class", "Zu dieser Klasse wechseln"],
    currentClass: ["Clase actual", "Current class", "Aktuelle Klasse"],
    unlocked: ["Desbloqueada", "Unlocked", "Freigeschaltet"],
    missingRecipe: ["Te falta: {items}", "Missing: {items}", "Es fehlt: {items}"],
    classChanged: ["¡Ahora eres {cls}!", "You are now a {cls}!", "Du bist jetzt {cls}!"],
    whereToFind: ["Dónde conseguirlo", "Where to get it", "Wo man es bekommt"],
    sourceShop: ["Tienda", "Shop", "Laden"],
    sourceFloor: ["Botín del piso {floor}", "Loot on floor {floor}", "Beute auf Ebene {floor}"],
    sourceUnknown: ["Aún no se sabe dónde se consigue", "Nobody knows where to find it yet", "Noch weiß niemand, wo es zu finden ist"],
    howToBecome: ["Cómo conseguir esta clase", "How to get this class", "Wie man diese Klasse erhält"],
    howToSteps: ["1) Compra un Tomo de clase aquí. 2) Reúne los objetos de la receta. 3) Pulsa «Transformar».", "1) Buy a Class Tome here. 2) Gather the recipe items. 3) Press “Transform”.", "1) Kaufe hier einen Klassenfolianten. 2) Sammle die Rezeptgegenstände. 3) Drücke „Verwandeln“."],
    transformBanner: ["¡Transformación!", "Transformation!", "Verwandlung!"],
    classSwitchBanner: ["Cambio de clase", "Class change", "Klassenwechsel"],
    chooseMode: ["¿Cómo quieres luchar?", "How do you want to fight?", "Wie willst du kämpfen?"],
    modeTurns: ["Por turnos", "Turn-based", "Rundenbasiert"],
    modeRealTime: ["Tiempo real", "Real time", "Echtzeit"],
    modeTurnsDesc: ["Seguro: habilidades, objetos y compañeros.", "Safe: abilities, items and companions.", "Sicher: Fähigkeiten, Gegenstände und Gefährten."],
    modeRealTimeDesc: ["Esquiva con tu habilidad: +{pct}% de XP y oro. Llena el Foco para pasar a turnos.", "Dodge with skill: +{pct}% XP and gold. Fill the Focus to switch to turns.", "Weiche geschickt aus: +{pct}% EP und Gold. Fülle den Fokus, um zu Runden zu wechseln."],
    recommended: ["Recomendado", "Recommended", "Empfohlen"],
    traitHeavy: ["Pesado y lento: golpea fuerte en cada turno, pero sus golpes se ven venir. Mejor en tiempo real.", "Heavy and slow: hits hard every turn but telegraphs its swings. Better in real time.", "Schwer und langsam: trifft jede Runde hart, aber holt sichtbar aus. Besser in Echtzeit."],
    traitSwift: ["Ágil: en tiempo real se abalanza sobre ti. Mejor por turnos.", "Swift: in real time it pounces on you. Better turn-based.", "Flink: in Echtzeit springt es dich an. Besser rundenbasiert."],
    traitCaster: ["Lanzador: en tiempo real guarda la distancia y dispara ráfagas. Mejor por turnos.", "Caster: in real time it keeps its distance and fires volleys. Better turn-based.", "Zauberer: in Echtzeit hält es Abstand und feuert Salven. Besser rundenbasiert."],
    traitBalanced: ["Equilibrado: ninguna ventaja clara; en tiempo real ganas más.", "Balanced: no clear edge; real time pays more.", "Ausgewogen: kein klarer Vorteil; Echtzeit lohnt sich mehr."],
    focus: ["Foco", "Focus", "Fokus"],
    focusReady: ["¡Foco listo! Pulsa F para pasar a turnos", "Focus ready! Press F to switch to turns", "Fokus bereit! Drücke F für Runden"],
    focusSwitched: ["El Foco congela el tiempo: el enemigo pierde su primer turno", "Focus freezes time: the enemy loses its first turn", "Der Fokus friert die Zeit ein: der Gegner verliert seinen ersten Zug"],
    realTimeHelp: ["WASD mover · Clic izq./J atacar · 1-4 habilidades · Espacio avance con tajo · F Foco", "WASD move · Left click/J attack · 1-4 abilities · Space dash slash · F Focus", "WASD bewegen · Linksklick/J angreifen · 1-4 Fähigkeiten · Leertaste Sturmhieb · F Fokus"],
    tooFar: ["Demasiado lejos", "Too far", "Zu weit weg"],
    bagFull: ["¡La bolsa está llena! Deja cosas en el banco", "Your bag is full! Store things in the bank", "Deine Tasche ist voll! Lagere Dinge in der Bank ein"],
    bag: ["Bolsa", "Bag", "Tasche"],
    bank: ["Banco", "Bank", "Bank"],
    bankGreeting: ["Lo que guardes aquí está a salvo aunque caigas en la mazmorra. Haz clic en un objeto para moverlo.", "Whatever you store here is safe even if you fall in the dungeon. Click an item to move it.", "Was du hier lagerst, ist sicher, auch wenn du im Dungeon fällst. Klicke auf einen Gegenstand, um ihn zu verschieben."],
    depositAll: ["Guardar todo", "Store all", "Alles einlagern"],
    bankFull: ["El banco está lleno", "The bank is full", "Die Bank ist voll"],
    slotsUsed: ["{used}/{max} huecos", "{used}/{max} slots", "{used}/{max} Plätze"],
    character: ["Personaje", "Character", "Charakter"],
    clickToMove: ["Clic: mover", "Click: move", "Klick: verschieben"],
    selectItemHint: ["Haz clic en un objeto para ver qué hace", "Click an item to see what it does", "Klicke auf einen Gegenstand, um zu sehen, was er tut"],
    unequipBagFull: ["No cabe en la bolsa: haz hueco primero", "It does not fit in the bag: make room first", "Passt nicht in die Tasche: mach zuerst Platz"],
    clickEnemyToAttack: ["También puedes hacer clic en el monstruo", "You can also click the monster", "Du kannst auch auf das Monster klicken"],
    perfectDodge: ["¡Esquiva perfecta!", "Perfect dodge!", "Perfektes Ausweichen!"],
    buyTome: ["Comprar tomo de clase", "Buy class tome", "Klassenfolio kaufen"],
    abilities: ["Habilidades", "Abilities", "Fähigkeiten"],
    baseStats: ["Atributos base", "Base stats", "Grundwerte"],
    growth: ["Crecimiento", "Growth", "Zuwachs"],

    // House
    house: ["Tu casa", "Your house", "Dein Haus"],
    houseGreeting: ["Hogar, dulce hogar. Aquí planeas tus hazañas.", "Home sweet home. Here you plan your feats.", "Trautes Heim. Hier planst du deine Heldentaten."],
    feats: ["Hazañas", "Feats", "Heldentaten"],
    perks: ["Ventajas permanentes", "Permanent perks", "Dauerhafte Vorteile"],
    rank: ["Rango {r}/{max}", "Rank {r}/{max}", "Rang {r}/{max}"],
    learn: ["Aprender ({cost} pt)", "Learn ({cost} pt)", "Lernen ({cost} P)"],
    notEnoughPoints: ["No tienes puntos de hazaña.", "Not enough feat points.", "Nicht genug Heldenpunkte."],
    perkLearned: ["Ventaja mejorada.", "Perk improved.", "Vorteil verbessert."],
    records: ["Registro", "Records", "Chronik"],
    deepestFloor: ["Piso más profundo", "Deepest floor", "Tiefste Ebene"],
    totalKills: ["Monstruos derrotados", "Monsters defeated", "Besiegte Monster"],
    bossKills: ["Jefes derrotados", "Bosses defeated", "Besiegte Bosse"],
    runsStarted: ["Expediciones", "Runs", "Expeditionen"],
    deaths: ["Derrotas", "Defeats", "Niederlagen"],
    victories: ["Victorias finales", "Final victories", "Endsiege"],
    restAndSave: ["Descansar y guardar", "Rest and save", "Ausruhen und speichern"],

    // Portal / preparation
    portal: ["Portal", "Portal", "Portal"],
    preparation: ["Preparación de la expedición", "Expedition preparation", "Expeditionsvorbereitung"],
    prepHint: ["Compra lo último que necesites. Al entrar se toma una instantánea de tu oro e inventario: si caes, vuelves a ella.", "Buy your last supplies. On entering, your gold and inventory are snapshotted: if you fall, they revert to it.", "Kaufe letzte Vorräte. Beim Betreten werden Gold und Inventar gesichert: Fällst du, wird darauf zurückgesetzt."],
    classLockedForRun: ["Tu clase quedará bloqueada durante la expedición.", "Your class will be locked for the run.", "Deine Klasse wird für die Expedition gesperrt."],
    startingFloor: ["Piso inicial", "Starting floor", "Startebene"],
    enterDungeon: ["Entrar en la mazmorra", "Enter the dungeon", "Dungeon betreten"],
    expeditionBonus: ["Bolsa de expedición: +{gold} de oro", "Expedition purse: +{gold} gold", "Expeditionsbeutel: +{gold} Gold"],
    quickShop: ["Suministros", "Supplies", "Vorräte"],

    // Coliseum / arena
    coliseum: ["Coliseo", "Coliseum", "Kolosseum"],
    coliseumGreeting: ["Combate en tiempo real: 5 oleadas. WASD mover, Espacio esquivar, Clic/J golpe, Clic dcho/K rayo.", "Real-time combat: 5 waves. WASD move, Space dash, Click/J strike, Right-click/K bolt.", "Echtzeitkampf: 5 Wellen. WASD bewegen, Leertaste Ausweichen, Klick/J Schlag, Rechtsklick/K Blitz."],
    startArena: ["Entrar a la arena", "Enter the arena", "Arena betreten"],
    wave: ["Oleada {n}/{max}", "Wave {n}/{max}", "Welle {n}/{max}"],
    arenaWon: ["¡Has sobrevivido a todas las oleadas!", "You survived every wave!", "Du hast alle Wellen überlebt!"],
    arenaLost: ["Has caído en la arena.", "You fell in the arena.", "Du bist in der Arena gefallen."],
    arenaReward: ["Premio: {gold} de oro", "Prize: {gold} gold", "Preis: {gold} Gold"],
    dashCharges: ["Esquivas", "Dashes", "Ausweichen"],
    returnToTown: ["Volver al pueblo", "Return to town", "Zurück ins Dorf"],

    // Dungeon
    dungeon: ["Mazmorra", "Dungeon", "Dungeon"],
    enteringFloor: ["Piso {n}", "Floor {n}", "Ebene {n}"],
    floorUnlocked: ["¡Piso {n} desbloqueado como punto de partida!", "Floor {n} unlocked as a starting point!", "Ebene {n} als Startpunkt freigeschaltet!"],
    crossroads: ["Encrucijada", "Crossroads", "Kreuzweg"],
    crossroadsHint: ["Tres caminos. Elige uno.", "Three paths. Choose one.", "Drei Wege. Wähle einen."],
    pathCombat: ["Camino del combate", "Path of battle", "Pfad des Kampfes"],
    pathTreasure: ["Camino del tesoro", "Path of treasure", "Pfad des Schatzes"],
    pathRest: ["Camino del descanso", "Path of rest", "Pfad der Rast"],
    pathEvent: ["Camino del misterio", "Path of mystery", "Pfad des Geheimnisses"],
    pathElite: ["Camino del campeón", "Path of the champion", "Pfad des Champions"],
    choose: ["elegir", "choose", "wählen"],
    openChest: ["abrir el cofre", "open the chest", "die Truhe öffnen"],
    rest: ["descansar", "rest", "rasten"],
    investigate: ["investigar", "investigate", "untersuchen"],
    descend: ["bajar", "descend", "hinabsteigen"],
    chestContents: ["El cofre contiene:", "The chest contains:", "Die Truhe enthält:"],
    rested: ["Descansas junto al fuego. Recuperas PV y maná.", "You rest by the fire. HP and mana restored.", "Du rastest am Feuer. LP und Mana erholt."],
    alreadyRested: ["El fuego se ha apagado.", "The fire has gone out.", "Das Feuer ist erloschen."],
    pickedUp: ["+{item}", "+{item}", "+{item}"],
    pickedGold: ["+{gold} oro", "+{gold} gold", "+{gold} Gold"],
    bossRoom: ["Sala del jefe", "Boss room", "Bossraum"],
    stairsChoice: ["Las escaleras descienden a la oscuridad.", "The stairs descend into darkness.", "Die Treppe führt hinab in die Dunkelheit."],
    descendTo: ["Bajar al piso {n}", "Descend to floor {n}", "Hinab zu Ebene {n}"],
    returnKeepLoot: ["Volver al pueblo (conservas el botín)", "Return to town (keep your loot)", "Zurück ins Dorf (Beute behalten)"],
    featPointGained: ["¡+1 punto de hazaña!", "+1 feat point!", "+1 Heldenpunkt!"],
    diamondsGained: ["+{n} diamantes", "+{n} diamonds", "+{n} Diamanten"],
    map: ["Mapa", "Map", "Karte"],
    trapTriggered: ["¡Una trampa! Pierdes {hp} PV.", "A trap! You lose {hp} HP.", "Eine Falle! Du verlierst {hp} LP."],
    runOver: ["Has caído", "You have fallen", "Du bist gefallen"],
    runOverText: ["La expedición termina. Pierdes el botín de la expedición, pero conservas la XP y los niveles.", "The run is over. You lose the run's loot but keep XP and levels.", "Die Expedition endet. Die Beute ist verloren, EP und Stufen bleiben."],
    returnedToTown: ["Has vuelto al pueblo.", "You returned to town.", "Du bist ins Dorf zurückgekehrt."],
    xpEarned: ["XP ganada", "XP earned", "Verdiente EP"],
    goldEarned: ["Oro ganado", "Gold earned", "Verdientes Gold"],
    runSummary: ["Resumen", "Summary", "Zusammenfassung"],

    // Events
    eventBlueprintTitle: ["Un plano olvidado", "A forgotten blueprint", "Ein vergessener Bauplan"],
    eventBlueprintText: ["Entre los escombros encuentras el plano de: {building}. ¡Se construirá en el pueblo!", "Among the rubble you find the blueprint for: {building}. It will be built in town!", "Im Schutt findest du den Bauplan für: {building}. Es wird im Dorf errichtet!"],
    eventClassTitle: ["Una figura encapuchada", "A hooded figure", "Eine verhüllte Gestalt"],
    eventClassText: ["«Veo otra senda en ti». La figura te toca la frente y te conviertes en {cls}. No hay vuelta atrás.", "\"I see another path in you.\" The figure touches your brow and you become a {cls}. There is no going back.", "„Ich sehe einen anderen Pfad in dir.“ Die Gestalt berührt deine Stirn und du wirst zu {cls}. Es gibt kein Zurück."],
    eventCompanionTitle: ["Una pequeña bestia", "A little beast", "Ein kleines Wesen"],
    eventCompanionText: ["Un {beast} te mira con curiosidad y decide seguirte durante la expedición.", "A {beast} looks at you curiously and decides to follow you for this run.", "Ein {beast} mustert dich neugierig und folgt dir auf dieser Expedition."],
    eventCompanionFull: ["Un {beast} te mira, pero tu grupo ya está completo. Te deja una poción.", "A {beast} looks at you, but your party is full. It leaves you a potion.", "Ein {beast} mustert dich, aber deine Gruppe ist voll. Es lässt dir einen Trank da."],
    eventShrineTitle: ["Santuario antiguo", "Ancient shrine", "Uralter Schrein"],
    eventShrineText: ["Rezas ante el santuario: {buff} durante el resto de la expedición.", "You pray at the shrine: {buff} for the rest of the run.", "Du betest am Schrein: {buff} für den Rest der Expedition."],
    eventWandererTitle: ["Un viajero amable", "A kind wanderer", "Ein freundlicher Wanderer"],
    eventWandererText: ["«Toma, lo necesitarás más que yo». Recibes: {items}.", "\"Here, you'll need it more than I do.\" You receive: {items}.", "„Hier, du brauchst es mehr als ich.“ Du erhältst: {items}."],
    eventTrapTitle: ["¡Trampa!", "Trap!", "Falle!"],
    eventTrapText: ["Unas púas surgen del suelo. Pierdes {hp} PV.", "Spikes burst from the floor. You lose {hp} HP.", "Stacheln schießen aus dem Boden. Du verlierst {hp} LP."],
    buffAtk: ["+15% ataque", "+15% attack", "+15% Angriff"],
    buffMatk: ["+15% ataque mágico", "+15% magic attack", "+15% Magieangriff"],
    buffDef: ["+15% defensas", "+15% defenses", "+15% Abwehr"],
    buffHp: ["+15% PV máximos", "+15% max HP", "+15% max. LP"],
    buffCrit: ["+8% crítico", "+8% critical", "+8% kritisch"],
    runBuffs: ["Bendiciones", "Blessings", "Segen"],

    // Combat
    attack: ["Atacar", "Attack", "Angreifen"],
    items: ["Objetos", "Items", "Gegenstände"],
    guard: ["Defender", "Guard", "Abwehr"],
    flee: ["Huir", "Flee", "Fliehen"],
    cannotFlee: ["¡No puedes huir de este combate!", "You can't flee this fight!", "Aus diesem Kampf kannst du nicht fliehen!"],
    notEnoughMana: ["No tienes maná suficiente.", "Not enough mana.", "Nicht genug Mana."],
    armored: ["{name} acorazado", "Armored {name}", "Gepanzerter {name}"],
    combatStart: ["¡{enemy} aparece!", "{enemy} appears!", "{enemy} erscheint!"],
    logAttack: ["{actor} usa {skill}.", "{actor} uses {skill}.", "{actor} setzt {skill} ein."],
    logDamage: ["{target} recibe {dmg} de daño.", "{target} takes {dmg} damage.", "{target} erleidet {dmg} Schaden."],
    logCrit: ["¡Crítico!", "Critical!", "Kritisch!"],
    logWeak: ["¡Es muy eficaz!", "It's super effective!", "Sehr effektiv!"],
    logResist: ["No es muy eficaz...", "Not very effective...", "Nicht sehr effektiv..."],
    logHeal: ["{target} recupera {hp} PV.", "{target} recovers {hp} HP.", "{target} erholt {hp} LP."],
    logMana: ["{target} recupera {mana} de maná.", "{target} recovers {mana} mana.", "{target} erholt {mana} Mana."],
    logBuff: ["{target}: {stat} aumenta.", "{target}: {stat} rises.", "{target}: {stat} steigt."],
    logStatus: ["{target} sufre {status}.", "{target} is afflicted by {status}.", "{target} leidet unter {status}."],
    logStatusTick: ["{target} sufre {dmg} por {status}.", "{target} takes {dmg} from {status}.", "{target} erleidet {dmg} durch {status}."],
    logFrozen: ["{target} está congelado y no puede actuar.", "{target} is frozen and can't act.", "{target} ist eingefroren und kann nicht handeln."],
    logAsleep: ["{target} está dormido.", "{target} is asleep.", "{target} schläft."],
    logWakes: ["{target} se despierta.", "{target} wakes up.", "{target} wacht auf."],
    logCharmed: ["{target} está hechizado y duda.", "{target} is charmed and hesitates.", "{target} ist betört und zögert."],
    logCharmSelfHit: ["¡{target} se golpea a sí mismo! ({dmg})", "{target} hits itself! ({dmg})", "{target} trifft sich selbst! ({dmg})"],
    logStatusEnd: ["{target} se libra de {status}.", "{target} is free of {status}.", "{target} ist {status} los."],
    logGuard: ["{actor} se pone en guardia.", "{actor} takes a defensive stance.", "{actor} geht in Abwehrhaltung."],
    logFleeOk: ["¡Escapas!", "You escaped!", "Du bist entkommen!"],
    logFleeFail: ["¡No consigues escapar!", "You couldn't escape!", "Flucht misslungen!"],
    logDefeated: ["¡{target} ha sido derrotado!", "{target} has been defeated!", "{target} wurde besiegt!"],
    logEnrage: ["¡{target} entra en furia!", "{target} becomes enraged!", "{target} gerät in Raserei!"],
    logImmune: ["{target} es inmune.", "{target} is immune.", "{target} ist immun."],
    logUseItem: ["{actor} usa {item}.", "{actor} uses {item}.", "{actor} benutzt {item}."],
    logCured: ["{target} se cura de sus estados.", "{target} is cured of ailments.", "{target} ist von Leiden geheilt."],
    logLifesteal: ["{actor} absorbe {hp} PV.", "{actor} drains {hp} HP.", "{actor} entzieht {hp} LP."],
    victory: ["¡Victoria!", "Victory!", "Sieg!"],
    victoryRewards: ["+{xp} XP · +{gold} oro", "+{xp} XP · +{gold} gold", "+{xp} EP · +{gold} Gold"],
    victoryXpOnly: ["+{xp} XP (sin botín: límite del piso)", "+{xp} XP (no loot: floor cap)", "+{xp} EP (keine Beute: Ebenenlimit)"],
    continueLabel: ["Continuar", "Continue", "Weiter"],
    defeat: ["Derrota", "Defeat", "Niederlage"],
    noUsableItems: ["No tienes objetos utilizables.", "You have no usable items.", "Keine benutzbaren Gegenstände."],
    enemyTurn: ["Turno enemigo...", "Enemy turn...", "Gegnerzug..."],
    yourTurn: ["Tu turno", "Your turn", "Dein Zug"],
    weakTo: ["Débil", "Weak", "Schwach"],
    resists: ["Resiste", "Resists", "Resistent"],
    boss: ["JEFE", "BOSS", "BOSS"],

    // Victory / credits
    finalVictory: ["¡Has derrotado al Soberano del Vacío!", "You defeated the Void Sovereign!", "Du hast den Leeren-Souverän besiegt!"],
    finalVictoryText: ["La luz vuelve a las profundidades. El pueblo celebrará tu nombre durante generaciones. Las mazmorras siguen ahí, y ahora son más peligrosas: puedes seguir jugando.", "Light returns to the depths. The town will sing your name for generations. The dungeons remain, now more dangerous: you can keep playing.", "Das Licht kehrt in die Tiefe zurück. Das Dorf wird deinen Namen noch Generationen besingen. Die Dungeons bleiben, nun gefährlicher: Du kannst weiterspielen."],
    creditsTitle: ["Créditos", "Credits", "Mitwirkende"],
    creditsDesign: ["Diseño, código, arte y audio procedurales", "Design, code, procedural art and audio", "Design, Code, prozedurale Grafik und Audio"],
    creditsFor: ["Hecho para Pablo", "Made for Pablo", "Gemacht für Pablo"],
    creditsTech: ["TypeScript · Canvas 2D · Web Audio · Vite", "TypeScript · Canvas 2D · Web Audio · Vite", "TypeScript · Canvas 2D · Web Audio · Vite"],
    creditsThanks: ["Gracias por jugar", "Thanks for playing", "Danke fürs Spielen"],
    playTime: ["Tiempo de juego", "Play time", "Spielzeit"],
    newGamePlus: ["Nivel de desafío", "Challenge level", "Herausforderungsstufe"],

    // Misc
    welcome: ["Bienvenido a Villaluz. El Gremio te espera: ahí subes de nivel. El portal del norte lleva a la mazmorra.", "Welcome to Lightvale. The Guild awaits: that's where you level up. The northern portal leads to the dungeon.", "Willkommen in Lichttal. Die Gilde erwartet dich: Dort steigst du auf. Das Nordportal führt in den Dungeon."],
    buildingUnlocked: ["¡Nuevo edificio: {building}!", "New building: {building}!", "Neues Gebäude: {building}!"],
    classAcquired: ["Clase desbloqueada: {cls}", "Class unlocked: {cls}", "Klasse freigeschaltet: {cls}"],
    blueprintBoss: ["El jefe guardaba un plano: {building}", "The boss guarded a blueprint: {building}", "Der Boss bewachte einen Bauplan: {building}"],
    challengeUp: ["Los monstruos se han vuelto más fuertes (desafío {n}).", "Monsters have grown stronger (challenge {n}).", "Die Monster sind stärker geworden (Herausforderung {n})."]
} satisfies Record<string, Triple>;

export type UiKey = keyof typeof UI;

/** Translates a UI key and replaces {placeholders}. */
export function t(key: UiKey, params: Record<string, string | number> = {}): string {
    const triple: Triple = UI[key];
    const index: number = currentLang === Lang.Es ? 0 : currentLang === Lang.En ? 1 : 2;
    let text: string = triple[index];
    for (const name of Object.keys(params)) {
        text = text.split("{" + name + "}").join(String(params[name]));
    }
    return text;
}
