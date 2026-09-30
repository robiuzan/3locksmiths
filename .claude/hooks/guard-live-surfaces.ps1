# PreToolUse hook -- two guards for the dynamic-presence work (docs/dynamic-presence-plan.md).
#
# 1. A `functions/` folder at the repo root is uploaded as Pages Functions by the very next
#    `ops/deploy-site.ps1 -Confirm`, with no change to the deploy script, no dry-run warning,
#    no `_headers`, and outside every content gate. Creating one must be a deliberate,
#    reviewed act (plan Phase 4c), never a side effect of an edit.
#
# 2. A Google API key (AIza...) or an OAuth refresh token written into this PUBLIC repo is
#    public the moment it is committed. Credentials live in ../Sys Admin, by variable name.
#
# Exit 2 blocks the tool call and shows the message; exit 0 lets it through. Best-effort:
# any error inside the hook exits 0 so it can never wedge a session. ASCII-only on purpose
# (PS 5.1 mis-decodes non-ASCII bytes in -File scripts).

$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()
if (-not $raw) { exit 0 }

$payload = $null
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }
if ($null -eq $payload) { exit 0 }

$tool = [string]$payload.tool_name
if ($tool -ne 'Write' -and $tool -ne 'Edit') { exit 0 }

# NOT `$input` -- that is a reserved PowerShell automatic variable; assigning to it fails silently
# under SilentlyContinue and every guard below then falls through to exit 0.
$ti = $payload.tool_input
if ($null -eq $ti) { exit 0 }

$path = [string]$ti.file_path
$text = ''
if ($null -ne $ti.content)    { $text += [string]$ti.content }
if ($null -ne $ti.new_string) { $text += [string]$ti.new_string }

# --- 1. functions/ at the repo root ---------------------------------------------------------
$norm = $path -replace '\\', '/'
if ($norm -match '(^|/)3locksmiths\.co\.il/functions/' -or $norm -match '^functions/') {
    [Console]::Error.WriteLine('BLOCKED: a functions/ folder deploys as Pages Functions on the next -Confirm, ' +
        'bypasses public/_headers and every content gate, and is not reverted by the out.prev rollback. ' +
        'See docs/dynamic-presence-plan.md Phase 4c. If this is that deliberate step, ask the user to ' +
        'confirm and re-run with the folder name spelled out in the request.')
    exit 2
}

# --- 2. secrets -----------------------------------------------------------------------------
if ($text -match 'AIza[0-9A-Za-z_\-]{35}') {
    [Console]::Error.WriteLine('BLOCKED: that looks like a Google API key. This repo is public; keys live in ' +
        '../Sys Admin/secrets/.env and are referenced by variable name (CLAUDE.md, fleet rules).')
    exit 2
}
if ($text -match '"refresh_token"\s*:\s*"[^"]{20,}"' -or $text -match '1//0[0-9A-Za-z_\-]{20,}') {
    [Console]::Error.WriteLine('BLOCKED: that looks like a Google OAuth refresh token. Never in the repo; ' +
        'custody is ../Sys Admin (docs/dynamic-presence-plan.md 4.6).')
    exit 2
}

exit 0
