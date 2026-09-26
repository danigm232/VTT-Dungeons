# Core engine — frontera acordada

Frontera implementada hasta Alpha 0.2.1 RC1: `shared/` contiene protocolo, esquema de campaña y geometría; `server/` compila el bundle inyectado, resuelve navegación/simulación, permisos, objetos y serialización filtrada. Los clientes y el renderer viven en `apps/web/` y cargan el DTO público antes de conectar. Ningún nombre de campaña o personaje está codificado en el motor. Consultar `ARCHITECTURE_DECISIONS.md` antes de ampliar contratos y `docs/ALPHA_0_3_PERSISTENCE_DISCOVERY.md` antes del futuro guardado.
