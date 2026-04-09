import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), "scraper", "scraper.py");
    const { stdout, stderr } = await execAsync(`python "${scriptPath}"`);
    return Response.json({ success: true, output: stdout });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}