import $RefParser from "@apidevtools/json-schema-ref-parser";
import { parse } from "yaml";

async function fetchYAML(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch YAML: ${response.statusText}`);

    const yamlText = await response.text();
    return parse(yamlText); // Parse YAML to OBJECT
  } catch (error) {
    console.error("Error fetching YAML:", error);
  }
}

export async function loadOpenAPI(url: string) {
  // Read and parse the YAML file
  const openapiData = await fetchYAML(url);
  // Resolve $ref references
  return await $RefParser.dereference(openapiData);
}

export async function getAllPaths(openapiData: any) {
  return Object.keys(openapiData.paths || {});
}

export async function getPathInfo(openapiData: any, path: string) {
  return openapiData.paths?.[path] || {};
}
