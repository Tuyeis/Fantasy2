import {Game} from "./core/game";
import {ClassKey} from "./data/hero-classes";
import {MonsterKey} from "./data/monsters";
import {validateTalentTrees} from "./data/talents";
import {preloadAbilityIcons} from "./render/ability-icons";
import {preloadArt} from "./render/art-assets";
import {preloadDungeonArt} from "./render/dungeon-art";
import {preloadMonsterArt} from "./render/monster-art";
import {preloadPuppets} from "./render/puppet/puppet-loader";
import {MainMenuScene} from "./scenes/main-menu-scene";

const game: Game = new Game();
// The game starts once every art file has finished loading (a file that fails is simply not drawn).
const classKeys: string[] = Object.values(ClassKey) as string[];
// The training dummy is drawn by code (render/training-dummy), it has no art files.
const monsterKeys: string[] = (Object.values(MonsterKey) as MonsterKey[]).filter((key: MonsterKey) => key !== MonsterKey.TrainingDummy);
Promise.all([preloadArt(), preloadAbilityIcons(), preloadDungeonArt(), preloadPuppets(classKeys.concat(monsterKeys)), preloadMonsterArt(monsterKeys)]).then(() => {
    game.start(new MainMenuScene(game));
});

if (import.meta.env.DEV) {
    // Debug handle for development only.
    (window as unknown as {game: Game}).game = game;
    const talentProblems: string[] = validateTalentTrees();
    if (talentProblems.length > 0) {
        console.error("Class abilities not granted exactly once by the talent trees:", talentProblems);
    }
}
