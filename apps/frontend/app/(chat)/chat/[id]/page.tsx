import { redirect } from "next/navigation";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  // Redirect old /chat/ routes to new /c/ routes
  redirect(`/c/${id}`);
}

