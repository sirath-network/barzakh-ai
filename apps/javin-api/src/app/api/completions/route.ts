import { shantanu, sharedFunction } from "@javin/shared";
export function GET(request: Request) {
  const v = shantanu();
  return new Response(v);
}
