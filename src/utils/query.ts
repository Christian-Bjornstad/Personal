import { InspectedApiSpec, SpecParameterDefinition } from "../types/openapi";

export type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | QueryPrimitive[];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateScalarValue(name: string, value: unknown, definition: SpecParameterDefinition): QueryPrimitive {
  const schema = definition.schema ?? {};

  if (schema.type === "integer") {
    if (!Number.isInteger(value)) {
      throw new Error(`Query parameter "${name}" must be an integer.`);
    }

    const numericValue = value as number;

    if (typeof schema.minimum === "number" && numericValue < schema.minimum) {
      throw new Error(`Query parameter "${name}" must be >= ${schema.minimum}.`);
    }

    if (typeof schema.maximum === "number" && numericValue > schema.maximum) {
      throw new Error(`Query parameter "${name}" must be <= ${schema.maximum}.`);
    }

    return numericValue;
  }

  if (schema.type === "number") {
    if (!isFiniteNumber(value)) {
      throw new Error(`Query parameter "${name}" must be a number.`);
    }

    const numericValue = value as number;

    if (typeof schema.minimum === "number" && numericValue < schema.minimum) {
      throw new Error(`Query parameter "${name}" must be >= ${schema.minimum}.`);
    }

    if (typeof schema.maximum === "number" && numericValue > schema.maximum) {
      throw new Error(`Query parameter "${name}" must be <= ${schema.maximum}.`);
    }

    return numericValue;
  }

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(`Query parameter "${name}" must be a boolean.`);
    }

    return value;
  }

  if (schema.type === "string" || schema.type === undefined) {
    if (typeof value !== "string") {
      throw new Error(`Query parameter "${name}" must be a string.`);
    }

    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      throw new Error(
        `Query parameter "${name}" must be one of: ${schema.enum.map(String).join(", ")}.`
      );
    }

    return value;
  }

  throw new Error(`Unsupported schema type "${schema.type}" for query parameter "${name}".`);
}

export function sanitizeQueryParams(
  params: Record<string, unknown>,
  spec: InspectedApiSpec
): Record<string, QueryValue> {
  const definitionMap = new Map<string, SpecParameterDefinition>(
    spec.queryParameters.map((definition) => [definition.name, definition])
  );
  const sanitized: Record<string, QueryValue> = {};

  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    const definition = definitionMap.get(name);

    if (!definition) {
      throw new Error(`Unknown query parameter "${name}" for ${spec.label} API.`);
    }

    const schema = definition.schema ?? {};

    if (schema.type === "array") {
      if (!Array.isArray(value)) {
        throw new Error(`Query parameter "${name}" must be an array.`);
      }

      const items = value.map((item) => {
        const itemDefinition: SpecParameterDefinition = {
          ...definition,
          schema: schema.items ?? {}
        };
        return validateScalarValue(name, item, itemDefinition);
      });

      sanitized[name] = items;
      continue;
    }

    sanitized[name] = validateScalarValue(name, value, definition);
  }

  for (const definition of spec.queryParameters) {
    if (definition.required && !(definition.name in sanitized)) {
      throw new Error(`Missing required query parameter "${definition.name}".`);
    }
  }

  return sanitized;
}

export function appendQueryParams(url: URL, params: Record<string, QueryValue>): URL {
  const nextUrl = new URL(url.toString());

  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        nextUrl.searchParams.append(name, String(item));
      }
      continue;
    }

    nextUrl.searchParams.append(name, String(value));
  }

  return nextUrl;
}
