# Stop hook -- format files changed in the git working tree with Prettier.
#
# Runs at turn end (Stop), AFTER all edits, so it never races the Edit tool's
# file-state tracking (a per-edit formatter would rewrite the file mid-session
# and cause "file has been modified" errors on the next edit).
#
# Best-effort and async: failures are swallowed, exit is always 0, and nothing
# is written to stdout (so it can never corrupt another Stop hook's output).
# ASCII-only on purpose (PS 5.1 mis-decodes non-ASCII bytes in -File scripts).
#
# Excludes, and why:
#   content/site.json        7 MB generated snapshot - reformatting it would
#                            produce a useless multi-thousand-line diff.
#   public/wp-content|wp-includes  vendored WordPress theme/plugin output.
#   .next out node_modules vendor   build + dependency output.

$ErrorActionPreference = 'SilentlyContinue'

# Drain stdin so the pipe never blocks; pull cwd if the payload has it.
$raw = [Console]::In.ReadToEnd()
$cwd = $null
try {
    if ($raw) { $cwd = ($raw | ConvertFrom-Json).cwd }
} catch { }
if (-not $cwd) { $cwd = (Get-Location).Path }

try {
    Push-Location $cwd

    # Collect changed + untracked paths from porcelain output ("XY path").
    $status = git status --porcelain
    $files = @()
    foreach ($line in $status) {
        if (-not $line) { continue }
        $path = $line.Substring(3).Trim()
        if ($path -match ' -> ') { $path = ($path -split ' -> ')[-1] }  # renames
        $files += $path.Trim('"')
    }

    $exts = '\.(ts|tsx|js|jsx|mjs|cjs|css|scss|md|mdx|json|html|yml|yaml)$'
    $skip = '(^|/)(node_modules|\.next|out|out\.prev|dist|build|vendor)/' +
            '|(^|/)public/wp-(content|includes)/' +
            '|(^|/)content/site\.json$' +
            '|(^|/)\.scratch'

    $targets = $files |
        Where-Object { $_ -match $exts -and $_ -notmatch $skip } |
        Select-Object -Unique

    if ($targets.Count -gt 0) {
        # --no-install: never auto-download; uses the local devDependency.
        # --ignore-unknown: silently skip anything Prettier can't handle.
        npx --no-install prettier --write --ignore-unknown $targets | Out-Null
    }
} catch { }
finally {
    try { Pop-Location } catch { }
}

exit 0
