# D8 V52 — arte generado, referencias y prompts

Fecha: 13 de octubre de 2026. Herramienta: ImageGen integrada de Codex. Uso: arte derivado para la mesa del usuario; no se declara CC0 ni arte oficial. No se incorporan imágenes de páginas externas. Los atlas no llevan retícula, texto ni muebles jugables horneados.

Los siguientes prompts registran la dirección y restricciones de generación de esta pasada, no una promesa de resultado perfecto ni una transcripción verificable de cada llamada intermedia. Las variantes de identidad usaron PNG del proyecto como referencia. No hubo retoque de bitmap mediante Python ni canvas.

## Archivos integrados

Todos los destinos están en `C:/Users/User/Desktop/Dungeons/campaigns/one-shot/public/art/v52/`.

| Archivo | Tamaño | Uso / recortes |
|---|---|---|
| island-village.png | 2172 × 724 | Fondo costero plano, transparente, lejano; sin colisión. |
| patrons-front.png | 1254 × 1254 | 3 filas de identidades × 3 gestos; celdas 418 × 418. |
| patrons-left.png | 1254 × 1254 | Mismas identidades/gestos, vista lateral izquierda. |
| patrons-right.png | 1254 × 1254 | Mismas identidades/gestos, vista lateral derecha. |
| patrons-rear.png | 1254 × 1254 | Mismas identidades/gestos, vista trasera. |
| prayer.png | 1774 × 887 | 2 personajes × 4 poses; bordes fraccionarios redondeados por código. |
| margaret-lead.png | 2172 × 724 | 1 fila × 3 poses de Margaret guiando hacia la izquierda. |

Los PNG originales finales se conservan en `C:/Users/User/.codex/generated_images/01a0a12a-4e01-7230-912b-02272c084843/`:

| Destino | Original final |
|---|---|
| island-village.png | exec-dfe19abd-53d2-40af-bf1a-11342e86729e.png |
| patrons-front.png | exec-06db44bf-6995-464d-a669-90425f4ce1b6.png |
| patrons-left.png | exec-28d9d30a-0495-4d0c-a1e5-11957b26dc51.png |
| patrons-right.png | exec-032c1f32-6a4a-4647-a6b9-c09c6ebfc87b.png |
| patrons-rear.png | exec-fb2664e7-8685-40e1-a8a8-b26c9abbbe5b.png |
| prayer.png | exec-99f3133b-fdbb-4872-83ef-99db266bfded.png |
| margaret-lead.png | exec-ac9703fa-661e-4c6e-9a11-bddb23a66197.png |

## Prompts de trabajo

### Pueblo costero

Panorama ancho 3:1, fondo transparente real, ilustración RPG pintada coherente con el templo. Aldea en una isla plana junto al mar: pequeñas casas de entramado de madera y revoco, cubiertas terracota y pizarra neutra, costa, puerto y horizonte marino. Vista oblicua de unos 25°. Sin colina, montaña, templo en primer plano, personas, rótulos, retícula ni marco. Solo fondo distante, no suelo jugable.

### Parroquianos: frontal, izquierda, derecha y espalda

Usar las bases existentes de patron, bartender y patron-woman para conservar identidad y ropa. Atlas transparente real 3 × 3: fila superior, hombre mayor con capa oliva; central, tabernero de chaleco rojo; inferior, mujer con pañuelo oxidado. Columnas: jarra baja en regazo, jarra a medio subir, sorbo. Expresión cansada/triste y postura sentada en una silla invisible. NO silla, mesa, taburete, suelo, sombra dibujada, fondo, glow, retícula ni texto. Las nueve figuras completas y centradas en celdas uniformes; escala y perspectiva coherentes. Generar una vista frontal y tres variantes de izquierda, derecha y espalda con los mismos personajes.

Las tres variantes laterales/trasera tuvieron una edición integrada adicional: limpiar exclusivamente los bordes rojos/amarillos de máscara alrededor de siluetas, preservando ropa roja deliberada, las nueve posiciones y el lienzo 1254 × 1254. El alfa casi transparente residual se documenta en la auditoría; no se declara un recorte absolutamente libre de halos.

### Oración

Referencias: las bases existentes de rogue (mediana de pelo rizado, cuero y cuello claro) y silverfarben-hotel (personaje gris, cabello largo/libro). Atlas transparente de 2 filas × 4 columnas, misma identidad, vestuario y escala de cada personaje: de pie con manos juntas, bajar una rodilla, arrodillado rezando, respiración sutil en esa postura. Cuerpo completo dentro de cada celda. Sin estatua, muebles, suelo, base, halo, retícula, rótulo ni fondo. No añadir rasgos nuevos ni convertir el rezo en un hechizo con efectos automáticos.

### Margaret con cuerda

Usar la base existente de Margaret, conservar rostro, cabello, vestido crema/rust, chal y equipo. Atlas transparente 1 × 3 de figura completa en vista izquierda/tres cuartos. Mano cerrada sujetando una cuerda corta a altura de cintura, que se dirige a la izquierda. Tres poses coherentes de respiración/postura, sin vaca, fondo, suelo, marco ni retícula. La cuerda final entre mano y vaca se calcula como geometría dinámica en el VTT, no como dibujo largo fijo.

## Integración y validación

`campaigns/one-shot/public/cafe-sprites.ts` declara los recortes y orientaciones. Las poses de bebida se colocan sobre sillas 3D existentes; las ocho direcciones lógicas usan cuatro vistas y espejo. La animación de oración mantiene el arrodillado durante la duración pedida sin alternar repetidamente con una pose de pie. La cuerda se ancla a la mano proyectada según cámara y posición actual de ambos actores.

Las pruebas comprueban PNG RGBA, alfa real en esquina y recortes acotados. La revisión de atlas aislado no sustituye la aceptación visual dentro del VTT.
