const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function runQuiet(cmd, opts) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
}

(function main() {
  try {
    const repo = runQuiet('git config --get remote.origin.url');
    if (!repo) {
      console.error('No remote.origin.url found. Set the repository remote before deploying.');
      process.exit(1);
    }

    const buildDir = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(buildDir)) {
      console.error('Build directory not found. Run `npm run build` first.');
      process.exit(1);
    }

    const tmp = path.resolve(process.cwd(), '.deploy_tmp');

    // remove previous tmp if exists
    if (fs.existsSync(tmp)) {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    fs.mkdirSync(tmp, { recursive: true });

    // init git in tmp
    run('git init', { cwd: tmp });
    run('git checkout -b gh-pages', { cwd: tmp });
    run(`git remote add origin ${repo}`, { cwd: tmp });

    // copy build files into tmp
    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
          const link = fs.readlinkSync(srcPath);
          try { fs.symlinkSync(link, destPath); } catch (e) { /* ignore */ }
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(buildDir, tmp);

    // commit and push
    run('git add -A', { cwd: tmp });
    try {
      run('git commit -m "deploy"', { cwd: tmp });
    } catch (e) {
      // commit may fail if no changes
    }
    run('git push --force origin gh-pages', { cwd: tmp });

    // cleanup
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('\nDeploy finished.');
  } catch (err) {
    console.error('Deploy failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
