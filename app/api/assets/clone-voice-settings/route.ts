import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";

export async function GET() {
  const filePath = path.join(process.cwd(), "assets", "clone_voice_settings.txt");
  try {
    const text = await readFile(filePath, "utf8");
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
