import { InspectedApiSpec, OpenApiDocument, OpenApiOperation, OpenApiSchema } from "../types/openapi";

function ensureAbsoluteRequestUrl(serverUrl: string | null, endpointPath: string): string {
  if (!serverUrl) {
    throw new Error(`The OpenAPI spec does not define a server URL for endpoint "${endpointPath}".`);
  }

  if (/^https?:\/\//i.test(serverUrl) && serverUrl.endsWith(endpointPath)) {
    return serverUrl;
  }

  return new URL(endpointPath, serverUrl).toString();
}

function getFirstGetOperation(document: OpenApiDocument): { endpointPath: string; operation: OpenApiOperation } {
  for (const [endpointPath, pathItem] of Object.entries(document.paths)) {
    if (pathItem.get) {
      return {
        endpointPath,
        operation: pathItem.get
      };
    }
  }

  throw new Error("The OpenAPI spec does not contain a GET operation.");
}

function detectResponseArrayProperty(schema: OpenApiSchema | null): string | null {
  const properties = schema?.properties;

  if (!properties) {
    return null;
  }

  for (const [name, propertySchema] of Object.entries(properties)) {
    if (propertySchema.type === "array") {
      return name;
    }
  }

  return null;
}

export function inspectOpenApiDocument(
  label: "charter" | "flights",
  filePath: string,
  document: OpenApiDocument
): InspectedApiSpec {
  const { endpointPath, operation } = getFirstGetOperation(document);
  const responseSchema =
    operation.responses?.["200"]?.content?.["application/json"]?.schema ?? null;
  const serverUrl = document.servers?.[0]?.url ?? null;

  return {
    label,
    filePath,
    serverUrl,
    endpointPath,
    requestUrl: ensureAbsoluteRequestUrl(serverUrl, endpointPath),
    operationId: operation.operationId ?? null,
    queryParameters: (operation.parameters ?? [])
      .filter((parameter) => parameter.in === "query")
      .map((parameter) => ({
        name: parameter.name,
        required: Boolean(parameter.required),
        explode: parameter.explode ?? false,
        schema: parameter.schema ?? {},
        description: parameter.description
      })),
    queryParameterNames: (operation.parameters ?? [])
      .filter((parameter) => parameter.in === "query")
      .map((parameter) => parameter.name),
    responseSchema,
    responseArrayProperty: detectResponseArrayProperty(responseSchema)
  };
}

