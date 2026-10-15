import {
	ArcServiceError,
	getPublicReceipt,
} from "@barzakh/shared/lib/arc/server";
import { hashSchema } from "@barzakh/shared/lib/arc/protocol";

export const runtime = "nodejs";
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ hash: string }> },
) {
	try {
		const { hash } = await params;
		if (!hashSchema.safeParse(hash).success)
			return Response.json(
				{ error: "Invalid transaction hash" },
				{ status: 400 },
			);
		return Response.json(await getPublicReceipt(hash), {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("[Arc API] Receipt lookup error:", error);
		return Response.json(
			{
				error:
					error instanceof ArcServiceError
						? error.message
						: error instanceof Error
							? error.message
							: "Receipt verification unavailable",
			},
			{ status: error instanceof ArcServiceError ? error.status : 500 },
		);
	}
}
