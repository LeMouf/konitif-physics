/** JSON-shaped data carried by physics sources and observations, not executable policy. */
export type PhysicsMetadataValue = string | number | boolean | null | PhysicsMetadata | PhysicsMetadataValue[];
export type PhysicsMetadata = { [key: string]: PhysicsMetadataValue };
