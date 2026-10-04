import { spawnSync } from "node:child_process";

const previewBranch = "feature/test2";
const currentBranch = process.env.WORKERS_CI_BRANCH;

if (currentBranch !== previewBranch) {
  console.log(
    `[cloudflare] Preview deployment skipped: branch "${currentBranch ?? "unknown"}" is not "${previewBranch}".`,
  );
  process.exit(0);
}

console.log(`[cloudflare] Deploying Preview for branch "${previewBranch}".`);

function run(command) {
  const result = spawnSync(command, {
    env: process.env,
    shell: true,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[cloudflare] Failed to run command: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm run build");
run("npm exec -- wrangler preview");
