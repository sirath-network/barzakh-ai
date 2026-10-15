import { readFile } from "node:fs/promises";
import { arcDatabase } from "../packages/shared/src/lib/arc/server";

async function main() {
	const sql = arcDatabase();
	try {
		const migration = await readFile(
			new URL("./arc-receipts.sql", import.meta.url),
			"utf8",
		);
		await sql.unsafe(migration);
		console.log("Arc receipt table is ready. Existing data was preserved.");
	} finally {
		await sql.end();
	}
}
main().catch(() => {
	console.error(
		"Arc receipt migration failed. Check database connectivity and permissions.",
	);
	process.exitCode = 1;
});
