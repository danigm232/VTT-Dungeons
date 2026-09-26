# Stormwreck · guion de sonido y VFX

Este documento separa el guion de la aventura de los archivos con licencia. No
reproduce texto, diálogos, mapas ni audio de *Dragons of Stormwreck Isle*.
Los identificadores remiten a la biblioteca instalada en `public/audio`, con licencias mixtas según `../public/STORMWRECK_AUDIO_CREDITS.md` (CC0, Pixabay y síntesis propia). No toda la biblioteca es CC0. Revisión21/09: este documento propone cues; no acredita triggers o escenas C4–C9 ya implementados. Ver `PECIO_SPATIAL_PLAN.md` y roadmap vigente antes de ampliar el contenido.

## Regla de mesa

- **Ambiente** sitúa el lugar y puede quedar en bucle.
- **Música** solo cambia el tono; se apaga en diálogo importante o investigación.
- **Efecto puntual** confirma una acción. Nunca debe ocultar una tirada, una voz
  o la descripción del DM.
- La consola muestra primero los efectos recomendados por el mapa activo. La
  biblioteca completa queda detrás de los filtros de categoría.

## Qué se puede repetir

| Tipo | Bucle | Controles discretos |
| --- | --- | --- |
| Mar, viento, casco, bosque, santuario, lluvia y tormenta | Sí | `∞`, velocidad 0,75× / 1× / 1,25×, y 1 / 2 / 3 / 6 / 12 pases si se desactiva `∞`. |
| Música | Sí, por pista | Volumen y pausa; no se añaden repeticiones a la pantalla principal. |
| Pisadas, ataque, criatura, puerta, hechizo, tesoro | No | Un toque equivale a un efecto. Repetirlos automáticamente distrae y suena artificial. |

## Escenas y mapas

| Mapa de la aventura | Base sugerida | Efectos que deben aparecer primero |
| --- | --- | --- |
| Dragon’s Rest | `stormwreck-loop-sanctuary` bajo, más `stormwreck-loop-ocean` | paso sobre basalto, libro/pergamino, luz/revelación, chispa de magia. |
| Seagrow Caves | océano muy bajo + viento; bosque solo antes de entrar | pasos de piedra, escarcha arcana, humo/niebla, objeto de piedra, gruñido de criatura. |
| Cursed Shipwreck · llegada | océano + viento | gemido de zombi I/II, pasos de piedra, golpe, revelación. |
| Cursed Shipwreck · cubierta | olas contra casco + madera + viento | pasos de cubierta, cadena, crujido de casco, canto de arpía, golpe, rugido. |
| Cursed Shipwreck · interiores | madera, sin música por defecto | puerta/escotilla, cerradura, madera, diario, tesoro. |
| Clifftop Observatory | `stormwreck-loop-cliff-wind`; tormenta solo si la ficción la exige | pasos de basalto, ritual dracónico, trueno/aliento, chispa, corrupción, rugido dracónico. |

Los tres mapas que ya existen en esta instalación (`wreck-approach`,
`wreck-deck`, `wreck-objects`) tienen estos perfiles en `public/pack.ts`. Los
otros perfiles quedan definidos aquí hasta contar con su imagen de mapa y poder
crearlos como escenas reales, sin inventar un tablero que no corresponde a la
aventura.

## Personajes de jugador y acciones comunes

La ficha privada actual confirma: Mike es mago alto elfo con espada corta y
libro de conjuros; Mia es clériga con maza y hacha de mano; Maria es pícaro con
arco corto, dagas y herramientas de ladrón. Los conjuros concretos de Mike y
Mia no están escritos en esas fichas, así que no se conceden ni se automatizan
opciones que el jugador no haya elegido.

| Acción | Audio | VFX / animación |
| --- | --- | --- |
| Andar: basalto, cubierta, grava | `d8-night-sfx-step-stone`, `d8-night-sfx-step-wood`, `d8-night-sfx-movement-gravel` | desplazamiento de ficha. |
| Correr, saltar, caer, recibir golpe | `d8-night-sfx-movement-sprint`, `d8-night-sfx-world-stone-impact`, `d8-night-sfx-attack-hit` | desplazamiento rápido / reacción de impacto. |
| Espada corta, maza, hacha, daga, garra, mordisco | `d8-night-sfx-attack-swing` o `d8-night-sfx-attack-dagger`, seguido de `d8-night-sfx-attack-hit` al impactar | animación cuerpo a cuerpo. |
| Arco corto o honda | `d8-night-sfx-attack-swing` y `d8-night-sfx-attack-hit` | animación de proyectil cuando la acción la declare. |
| Esquivar, defender, bloqueo | `d8-night-sfx-combat-blade-parry` | reacción de ficha; no repetir en bucle. |
| Ocultarse, registrar, estudiar, ayudar, prepararse, usar objeto | `d8-night-sfx-world-leather-pack`, `d8-night-sfx-world-book-open` o silencio | animación de interactuar; la mayoría no necesita un sonido. |
| Abrir, cerrar, forzar o desarmar | `d8-night-sfx-world-door-close`, `d8-night-sfx-world-lock`, `d8-night-sfx-world-wood-impact` | animación de objeto. |
| Tesoro, mapa, diario | `d8-night-sfx-coins`, `d8-night-sfx-world-book-open` | resalte de objeto, sin fanfarria automática. |
| Curar / Palabra sanadora / Curar heridas | `d8-night-sfx-magic-heal` | destello arcano sutil. |
| Luz / Llama sagrada / Detectar magia | `d8-night-sfx-magic-reveal` | chispa arcana o proyectil radiante. |
| Taumaturgia, ilusión, truco menor, Mano de mago | `d8-night-sfx-magic-spark` | chispa arcana; humo para ilusión. |
| Rayo de escarcha | `d8-night-sfx-spell-frost` | humo frío / proyectil mágico. |
| Proyectil de fuego, Rayo abrasador, aliento de fuego | `d8-night-sfx-spell-fire` | llama y proyectil de fuego. |
| Onda atronadora, trueno, aliento de relámpago | `d8-night-sfx-magic-impact` o `stormwreck-sfx-thunder` | flash de tormenta cuando proceda; no activar lluvia por un solo hechizo. |
| Armadura de mago, Escudo, protección divina | `d8-night-sfx-magic-ward` | aura/chispa, no bucle. |
| Niebla, teletransporte, aparición | `d8-night-sfx-magic-teleport` | partícula de humo. |
| Maldición, miedo, energía corrupta | `d8-night-sfx-magic-curse` | humo oscuro y reacción de ficha. |

Para nivel 2 y 3, los controles no asumen una subclase: el pícaro puede usar
la misma familia de sigilo para Acción astuta; el mago, la familia arcana y los
elementos que haya seleccionado; el clérigo, curación/revelación/protección y
el dominio realmente elegido. Antes de añadir una acción a combate se exige la
ficha concreta, con su bonificador, daño, recurso y `soundId` declarativo.

## Criaturas y PNJ

| Presencia | Momentos | Audio y VFX apropiados |
| --- | --- | --- |
| Runara humana | Conversación, santuario, revelación | santuario en bucle muy bajo; libro, revelación o ritual solo cuando la ficción lo pida. No hay una voz falsa para un PNJ que habla a través del DM. |
| Runara en forma de dragón | Transformación, vuelo, aliento, protección | `d8-night-sfx-creature-roar-02`, `stormwreck-sfx-thunder`, chispa/arcano; ficha con animación de ataque. Ninguno en bucle. |
| Kobolds y aliados de Sparkrender | Patrulla, emboscada, daga, honda, rendición | pasos de piedra, daga o ataque, impacto, cadena/objeto para el observatorio. |
| Sparkrender | Entrada, ritual, aliento de relámpago | rugido dracónico II, ritual dracónico, trueno/aliento, chispa, corrupción. |
| Arpía | Aparición, vuelo, Canto cautivador, garras | viento del pecio como ambiente; `d8-night-sfx-magic-ominous` solo al iniciar el canto; ataque y golpe para garras. |
| Zombis ahogados | Entrada, avance, golpe, derrota | gemido I/II, pasos de cubierta o piedra, ataque/impacto, `stormwreck-sfx-undead-defeat`. |
| Gul | Aparición, mordisco/garras, parálisis, derrota | `stormwreck-sfx-ghoul-cry`, ataque/impacto, presagio oscuro en la parálisis, derrota no muerta. |
| Oso lechuza | Alerta, garra, pico, herida | gruñido, rugido, ataque/impacto, criatura herida/derrotada. |
| Micónidos, hongos y fauna de cuevas | Esporas, descubrimiento, amenaza o diálogo | ambiente bajo; chispa, humo, revelación o corrupción según la escena; sin voces prefabricadas. |
| Tarak, Varnoth y otros habitantes no hostiles | Charla, entrega de objeto, pista | santuario/océano bajo, libro, tesoro o silencio. El diálogo siempre queda para el DM. |

## Integración en el motor

`CombatAction.soundId` y `ExplorationAction.soundId` permiten asociar estos
identificadores sin poner lógica de audio en la interfaz. El servidor valida el
identificador y emite el efecto al resolver la acción. Las acciones sin
`soundId` mantienen una selección segura por tipo de animación.
