# Fantasy Game

RPG roguelite 2D con vista cenital: pueblo → mazmorra de 3 pisos → jefe final → victoria y créditos.
Hecho con TypeScript, Canvas 2D y Web Audio, con Vite como servidor de desarrollo. No usa assets externos: el arte y el sonido se generan por código.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5190
npm run build      # typecheck + build estático en dist/
```

## Controles

- **WASD / flechas**: moverse en 8 direcciones.
- **E / Espacio / Enter**: interactuar (edificios, cofres, hogueras, eventos, carteles, escaleras).
- **I**: inventario.
- **Rueda del ratón**: zoom.
- **ESC**: pausa o cerrar ventana.
- **Combate**: A atacar · 1-4 habilidades · Q objetos · G defender · F huir.
- **Arena**: WASD mover · Espacio esquivar (con invulnerabilidad y cargas) · Clic/J golpe · Clic derecho/K rayo.

## Estructura

```
src/core/     bucle, escenas, entrada, audio procedural, i18n (es/en/de), guardado, capa DOM de UI
src/data/     catálogos con claves estables (enums): clases, habilidades, objetos, monstruos, pisos, ventajas, misiones, edificios
src/logic/    reglas puras: matemáticas y motor de combate, generador de pisos, expedición, economía, progresión
src/render/   dibujo procedural (héroes, monstruos, compañeros, iconos, decorados)
src/scenes/   menú, pueblo, mazmorra, combate, arena, victoria
src/windows/  ventanas DOM: tienda, forja, gremio, biblioteca de clases, casa, preparación, inventario, opciones, pausa
```

La lógica solo compara claves estables (`ClassKey`, `ItemKey`, `MonsterKey`, `RoomType`, etc.) y nunca textos visibles. Todos los textos pasan por `t()` / `tr()`.
