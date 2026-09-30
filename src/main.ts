import {Game} from "./core/game";
import {ClassKey} from "./data/hero-classes";
import {MonsterKey} from "./data/monsters";
import {preloadAbilityIcons} from "./render/ability-icons";
import {preloadArt} from "./render/art-assets";
import {preloadDungeonArt} from "./render/dungeon-art";
import {preloadMonsterArt} from "./render/monster-art";
import {preloadPuppets} from "./render/puppet/puppet-loader";
import {MainMenuScene} from "./scenes/main-menu-scene";

const game: Game = new Game();
// Painted art is optional; the game starts once every file has either loaded or fallen back to procedural drawing.
const classKeys: string[] = Object.values(ClassKey) as string[];
const monsterKeys: string[] = Object.values(MonsterKey) as string[];
Promise.all([preloadArt(), preloadAbilityIcons(), preloadDungeonArt(), preloadPuppets(classKeys.concat(monsterKeys)), preloadMonsterArt(monsterKeys)]).then(() => {
    game.start(new MainMenuScene(game));
});

if (import.meta.env.DEV) {
    // Debug handle for development only.
    (window as unknown as {game: Game}).game = game;
}
