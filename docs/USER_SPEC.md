Quiero que actúes inicialmente como **arquitecto técnico y director del desarrollo** de un proyecto llamado provisionalmente **D&D Immersive Engine**.

Tu objetivo NO es entregarme únicamente una investigación, un plan, documentación o recomendaciones.

El objetivo global de este primer ciclo de desarrollo es que exista una:

# ALPHA 0.1 FUNCIONAL Y EJECUTABLE

que yo pueda probar en mi ordenador.

Sin embargo, quiero optimizar al máximo mi cuota de modelos.

Por ello, **Astra NO debe realizar automáticamente todo el desarrollo**.

Astra debe determinar qué partes justifican realmente utilizar Astra y qué partes conviene realizar posteriormente con Sol, Terra o Luna.

Yo cambiaré manualmente de modelo cuando Astra me lo indique.

---

# 1. VISIÓN DEL PROYECTO

Quiero crear un sistema reutilizable para jugar a Dungeons & Dragons presencialmente con amigos.

No quiero un VTT tradicional tipo Roll20 y tampoco quiero convertir D&D en un videojuego automático.

Quiero que el entorno digital represente y ambiente el mundo de la aventura mientras seguimos jugando D&D alrededor de una mesa.

La experiencia debe recordar, en cuanto a forma de explorar, a determinados RPG y videojuegos donde:

- siempre vemos al personaje dentro del escenario;
- el jugador mueve directamente a su personaje;
- la cámara utiliza una perspectiva elevada u oblicua;
- la cámara puede ser fija, semi-fija o acompañar suavemente al personaje según la escena;
- determinadas zonas pueden utilizar cámaras diferentes;
- el escenario tiene profundidad y vida;
- existen animaciones, iluminación, clima, música y efectos.

Como referencias exclusivamente para **lenguaje de cámara y control** pueden estudiarse:

- Final Fantasy VII clásico;
- Animal Crossing;
- Pokémon;
- otros RPG apropiados.

NO quiero copiar su estética.

No copies personajes, interfaces, música, escenarios, modelos ni assets protegidos.

---

# 2. LA CAMPAÑA DETERMINA LA DIRECCIÓN ARTÍSTICA

La primera campaña será:

**Los Dragones de la Isla de las Tempestades.**

La dirección visual y sonora debe surgir de esta aventura.

Estudia detenidamente el PDF de la campaña proporcionado antes de establecer la dirección artística.

Debe transmitir elementos como:

- fantasía D&D;
- isla remota;
- océano;
- acantilados;
- basalto;
- viento;
- tormentas;
- ruinas;
- naufragios;
- cuevas costeras;
- magia antigua;
- dragones;
- cicatrices mágicas producidas por dragones muertos.

Cada localización debe tener identidad propia.

### Retiro del Dragón
Refugio, tranquilidad, espiritualidad y relativa seguridad.

### Cuevas de Pleamar
Agua, roca, humedad, hongos, profundidad y presencia sobrenatural.

### Pecio
Mar, madera deteriorada, aislamiento, peligro y presencia maldita.

### Observatorio del Acantilado
Ruinas, altura, océano, tormenta, viento, poder dracónico y sensación de clímax.

La identidad debe ser **Isla de las Tempestades**, independientemente de las referencias utilizadas para resolver cámara o movimiento.

---

# 3. CÁMARA Y EXPLORACIÓN

No impongas una única vista cenital.

Prioriza:

**perspectiva elevada/oblicua + personaje visible + control directo.**

El motor debe poder soportar:

### Cámara fija
Composición concreta donde el personaje se mueve dentro de la escena.

### Cámara semi-fija
Puede desplazarse ligeramente o cambiar al alcanzar determinados puntos.

### Cámara de seguimiento suave
Acompaña al personaje manteniendo una perspectiva elevada.

No quiero que el jugador tenga que controlar constantemente una cámara 3D libre.

Debe concentrarse principalmente en:

**mover a su personaje y explorar.**

Los cambios de cámara pueden formar parte de la puesta en escena.

---

# 4. DISPOSITIVOS E INTERFACES

Tendré:

- PC/portátil del Dungeon Master;
- proyector conectado al ordenador;
- móvil de cada jugador;
- altavoces;
- dados físicos.

El sistema debe tener tres interfaces diferentes.

## DM

Solo yo la veo.

Debe controlar:

- escenas;
- jugadores;
- PNJ;
- monstruos;
- posiciones;
- apariciones;
- música;
- ambiente;
- SFX;
- efectos visuales;
- eventos;
- información secreta;
- cámaras.

## PLAYER

Cada jugador entra desde su móvil.

Debe controlar únicamente su personaje.

A largo plazo tendrá:

- joystick;
- WASD desde ordenador;
- PG;
- inventario;
- equipo;
- habilidades;
- conjuros;
- estados;
- información privada;
- interacción.

## PROJECTOR

Solo muestra el mundo:

- escenario;
- jugadores;
- PNJ;
- monstruos;
- animaciones;
- clima;
- efectos;
- iluminación.

Nunca debe mostrar herramientas de DM ni secretos.

---

# 5. D&D SIGUE SIENDO D&D

El software NO debe sustituir al Dungeon Master.

Los dados pueden seguir siendo físicos.

Las decisiones y reglas continúan resolviéndose en mesa.

El sistema fundamentalmente debe:

**representar + sincronizar + ambientar + aumentar la inmersión.**

---

# 6. MOTOR REUTILIZABLE

No construyas algo exclusivo para Isla de las Tempestades.

La arquitectura debe separar:

# CORE ENGINE

de

# CAMPAIGN PACKS

Conceptualmente:

/engine

/campaigns/stormwreck-isle

/campaigns/future-campaign

Una futura campaña debe poder utilizar:

- otros escenarios;
- otra música;
- otra ambientación;
- otro estilo gráfico;
- otro sistema de cámaras;

sin rehacer el motor.

---

# 7. FUENTES DE LA CAMPAÑA

Utiliza los documentos disponibles en el workspace, especialmente:

- Los Dragones de la Isla de las Tempestades;
- las fichas de personajes proporcionadas;
- Manual del Jugador cuando sea necesario.

Distingue siempre:

1. contenido oficial;
2. adaptación visual/técnica;
3. elementos añadidos para aumentar la inmersión.

No modifiques silenciosamente la aventura.

No muestres secretos de DM a los jugadores.

---

# 8. OPEN SOURCE: NO REINVENTES SISTEMAS RESUELTOS

Antes de desarrollar, investiga e inspecciona proyectos reutilizables.

Como mínimo:

- RPGJS;
- VeilCast VTT;
- Open-VTT;
- MiniVTT;
- RPGAtlas.

Busca además alternativas actuales que puedan ser mejores.

Investiga especialmente soluciones ya existentes para:

- movimiento;
- multiplayer;
- sincronización;
- móvil;
- joystick;
- cámara;
- mapas;
- personajes;
- animación;
- inventario;
- DM/proyector;
- audio;
- partículas;
- clima;
- iluminación;
- niebla.

Prioriza:

- proyectos mantenidos;
- MIT;
- Apache;
- assets CC0;
- funcionamiento local;
- navegador;
- móvil;
- buena documentación;
- código que Work/Codex pueda mantener razonablemente.

No juntes proyectos simplemente porque existen.

Decide:

- qué usar como base;
- qué componente reutilizar;
- qué estudiar solo como referencia;
- qué descartar.

RPGAtlas puede servir como referencia, pero analiza cuidadosamente GPL antes de reutilizar código.

---

# 9. OBJETIVO DE ESTE CICLO

Quiero acabar este primer ciclo con:

# ALPHA 0.1 JUGABLE

No implementes todavía toda la campaña.

Construye una **vertical slice**.

La demostración será una parte representativa del:

# PECIO DEL ROSA DE LOS VIENTOS

basada en la aventura proporcionada.

---

# 10. ALPHA 0.1 — SERVIDOR LOCAL

Debe:

- ejecutarse desde mi PC Windows;
- funcionar mediante red local;
- permitir que los móviles se conecten;
- mostrar claramente la dirección de conexión.

Si es razonable:

- genera QR de conexión.

---

# 11. ALPHA 0.1 — DM

Debe existir una interfaz tipo:

`/dm`

Desde ella debo poder:

- ver jugadores conectados;
- cambiar escena;
- revelar/ocultar criatura;
- controlar música;
- controlar ambientes;
- ejecutar al menos 3 SFX;
- activar/desactivar algún efecto visual;
- reposicionar elementos;
- controlar cambios de cámara cuando proceda.

---

# 12. ALPHA 0.1 — JUGADOR

Debe existir una interfaz tipo:

`/player`

Debe estar diseñada específicamente para móvil.

Un jugador debe poder:

- entrar con su personaje;
- moverlo con joystick;
- utilizar WASD desde ordenador;
- ver nombre;
- ver PG;
- abrir inventario básico;
- acercarse a algo interactuable;
- pulsar INTERACTUAR.

Prioriza controles grandes y cómodos.

---

# 13. ALPHA 0.1 — PROYECTOR

Debe existir una interfaz tipo:

`/projector`

Debe mostrar:

- escenario;
- personaje;
- movimiento animado;
- criatura cuando el DM la revele;
- elementos ambientales;
- efectos visuales.

Sin interfaz técnica.

---

# 14. ESCENA ALPHA: EL PECIO

Estudia primero el capítulo correspondiente de la aventura.

No hagas simplemente un barco genérico si la fuente permite una adaptación más precisa.

Prioriza una escena pequeña pero convincente.

Debe tener:

- personaje visible;
- movimiento;
- cámara elevada/oblicua;
- cámara fija, semi-fija o seguimiento suave según resulte más adecuado;
- colisiones;
- profundidad visual razonable;
- zona interactuable;
- criatura revelable;
- océano con movimiento;
- elementos ambientales animados;
- atmósfera coherente con Isla de las Tempestades.

Los gráficos pueden ser Alpha.

Pero NO quiero una demo abstracta formada únicamente por cuadrados de colores si existen recursos libres razonables para representar ya el concepto.

---

# 15. AUDIO — PRIORIDAD MUY ALTA

La música y el sonido son fundamentales.

Debe existir separación entre:

### MÚSICA

Tema ambiental/musical.

### AMBIENTE

Varias capas simultáneas, por ejemplo:

- océano;
- viento;
- madera;
- tormenta.

### SFX

Como mínimo:

- trueno;
- crujido;
- aparición/impacto.

El DM debe poder controlarlo.

Implementa fades/transiciones razonables.

Utiliza únicamente audio con licencia adecuada o placeholders propios.

No utilices música protegida de videojuegos comerciales.

---

# 16. SINCRONIZACIÓN

Cuando un jugador mueve su personaje:

**debe moverse prácticamente en tiempo real en el proyector.**

Cuando el DM revela una criatura:

**debe aparecer en el proyector.**

Cuando cambia audio o escena:

**las vistas correspondientes deben reaccionar correctamente.**

Cada jugador controla únicamente su personaje.

---

# 17. NO SOBRECARGAR LA ALPHA

NO necesitamos todavía:

- campaña completa;
- automatización completa de D&D;
- todas las clases;
- todos los conjuros;
- combate completo;
- IA de NPC;
- editor de campañas;
- matchmaking;
- servidor público;
- cuentas online;
- generación procedural.

Primero demuestra:

**DM + móvil + proyector + movimiento + cámara + escenario + audio + sincronización.**

---

# 18. DISEÑAR PARA CRECER

Aunque no lo implementes todavía, evita decisiones que bloqueen:

- varios jugadores;
- fichas completas;
- inventario D&D;
- conjuros;
- mensajes privados;
- iluminación;
- niebla;
- diferentes campañas;
- diferentes estilos gráficos;
- diferentes cámaras;
- mapas 2D/2.5D/3D ligero;
- animaciones;
- NPC;
- criaturas;
- guardado persistente;
- editor de campañas.

---

# 19. ESTRATEGIA DE MODELOS — MUY IMPORTANTE

Quiero minimizar el consumo de mi cuota, especialmente de Astra.

## ASTRA ES EL DIRECTOR TÉCNICO

Mientras estés funcionando como Astra:

NO asumas que tienes que realizar toda la Alpha.

Tu responsabilidad es determinar:

1. qué decisiones necesitan realmente Astra;
2. qué trabajo puede realizar Sol;
3. qué trabajo puede realizar Terra;
4. qué trabajo puede realizar Luna;
5. cuándo merece la pena volver a Astra.

Astra debe realizar personalmente únicamente las tareas cuya complejidad justifique claramente su uso.

## NO CAMBIES DE MODELO CONSTANTEMENTE

No quiero una estrategia como:

Astra → Sol → Astra → Terra → Sol → Astra → Luna...

Eso sería incómodo y poco práctico.

Agrupa el desarrollo en **bloques grandes y coherentes**.

Intenta que todo este primer ciclo necesite aproximadamente:

**3–5 cambios de modelo como máximo**, salvo que aparezca un problema excepcional.

Por ejemplo, una secuencia razonable podría ser:

### BLOQUE 1 — ASTRA
Investigación + arquitectura + elección de open source + diseño técnico + definición precisa de Alpha.

### BLOQUE 2 — SOL
Implementación principal completa.

### BLOQUE 3 — TERRA
Trabajo rutinario, limpieza, UI, datos, pequeños bugs o pruebas.

### BLOQUE 4 — ASTRA
Auditoría técnica final y resolución de problemas difíciles.

Esto es solamente un ejemplo.

Astra debe decidir la estrategia óptima después de estudiar realmente el proyecto.

## CUÁNDO PARAR

Cuando Astra determine que la siguiente fase no justifica seguir utilizando Astra:

**DETENTE.**

No empieces tú mismo la fase siguiente.

Déjame una instrucción claramente visible con este formato:

---

# CAMBIO DE MODELO RECOMENDADO

**Cambia ahora a: SOL / TERRA / LUNA / ASTRA**

### Motivo
Explicación de 2–4 líneas.

### Próximo bloque
Descripción exacta del trabajo que debe realizar el siguiente modelo.

### Prompt para continuar
Escribe el prompt COMPLETO que debo enviar al siguiente modelo para que continúe exactamente desde el estado actual del proyecto.

### Cuándo volver a cambiar
Indica qué condición concreta debe cumplirse antes de recomendar otro modelo.

---

Después de proporcionar esto:

**DETENTE.**

Yo cambiaré manualmente de modelo y utilizaré el prompt que has preparado.

## CONTINUIDAD

Todos los modelos deben trabajar sobre:

- el mismo repositorio;
- los mismos archivos;
- la misma arquitectura;
- las decisiones documentadas.

Antes de cada cambio importante, deja actualizado un archivo:

`PROJECT_STATE.md`

con:

- estado actual;
- qué funciona;
- decisiones tomadas;
- tareas pendientes;
- problemas conocidos;
- modelo recomendado para el siguiente bloque.

Así el modelo siguiente no necesita reconstruir mentalmente todo el proyecto.

## ASTRA NO DEBE GASTARSE EN:

- introducir datos repetitivos;
- renombrar archivos;
- escribir configuraciones triviales;
- realizar cambios menores de CSS;
- crear decenas de entradas similares;
- arreglos evidentes y locales;
- trabajo mecánico.

Estas tareas deben reservarse para Sol, Terra o Luna según dificultad.

## ASTRA SÍ DEBE UTILIZARSE PARA:

- elegir arquitectura;
- evaluar open source;
- decisiones con consecuencias globales;
- problemas de sincronización difíciles;
- problemas arquitectónicos;
- debugging complejo;
- integración complicada;
- auditoría del sistema;
- decisiones donde equivocarse implique rehacer mucho trabajo.

## PRINCIPIO GENERAL

**No busques utilizar el modelo más potente. Busca utilizar el modelo más barato que pueda realizar correctamente cada bloque sin poner en riesgo el proyecto.**

Pero evita fragmentar tanto el trabajo que los cambios de modelo produzcan más coste y confusión que ahorro.

---

# 20. PRIMERA TAREA DE ASTRA

Empieza tú, Astra.

Tu primera responsabilidad es:

1. leer esta especificación;
2. inspeccionar los documentos de campaña;
3. investigar los proyectos open source;
4. inspeccionar código real cuando sea necesario;
5. decidir qué reutilizar;
6. decidir arquitectura;
7. determinar cómo debe construirse la Alpha;
8. crear la estructura inicial del proyecto si resulta útil;
9. realizar personalmente únicamente el trabajo que consideres propio de Astra.

Después evalúa si seguir utilizando Astra tiene sentido.

Si la implementación principal puede realizarla Sol:

**no la hagas tú.**

Prepara el cambio de modelo siguiendo el protocolo anterior.

---

# 21. DEFINICIÓN FINAL DE ALPHA 0.1

El ciclo completo de modelos no termina hasta que yo pueda:

1. iniciar el proyecto en Windows;
2. abrir DM;
3. abrir Projector;
4. entrar desde móvil;
5. conectar un personaje;
6. moverlo;
7. verlo moverse en la pared;
8. abrir inventario;
9. acercarme a un punto interactuable;
10. interactuar;
11. revelar una criatura desde DM;
12. verla en el proyector;
13. activar ambiente;
14. iniciar música;
15. lanzar SFX;
16. volver a ocultar la criatura.

---

# 22. ENTREGA FINAL DEL CICLO

Cuando Alpha 0.1 esté terminada debe existir:

- código organizado;
- Alpha ejecutable;
- instrucciones sencillas para Windows;
- procedimiento simple de inicio;
- URLs de DM / Player / Projector;
- lista de funciones;
- placeholders;
- problemas conocidos;
- prioridades para Alpha 0.2.

Mantén además:

`ARCHITECTURE_DECISIONS.md`

`LICENSES_AND_CREDITS.md`

`PROJECT_STATE.md`

No des por terminada la Alpha porque exista documentación o un prototipo visual.

Tiene que funcionar realmente.

---

# EMPIEZA AHORA COMO ASTRA

Realiza únicamente el bloque de trabajo que realmente justifique utilizar Astra.

Cuando consideres que otro modelo puede continuar de forma suficientemente fiable y económica:

**detente, guarda el estado y dime exactamente a qué modelo debo cambiar y qué prompt debo enviarle.**