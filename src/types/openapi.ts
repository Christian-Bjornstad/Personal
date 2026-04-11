export interface OpenApiDocument {
  openapi: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, OpenApiPathItem>;
}

export interface OpenApiPathItem {
  get?: OpenApiOperation;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  responses?: Record<string, OpenApiResponse>;
}

export interface OpenApiParameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  explode?: boolean;
  schema?: OpenApiSchema;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiMediaType {
  schema?: OpenApiSchema;
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
}

export interface SpecParameterDefinition {
  name: string;
  required: boolean;
  explode: boolean;
  schema: OpenApiSchema;
  description?: string;
}

export interface InspectedApiSpec {
  label: "charter" | "flights";
  filePath: string;
  serverUrl: string | null;
  endpointPath: string;
  requestUrl: string;
  operationId: string | null;
  queryParameters: SpecParameterDefinition[];
  queryParameterNames: string[];
  responseSchema: OpenApiSchema | null;
  responseArrayProperty: string | null;
}

