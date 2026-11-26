# Lefthook Installation & Configuration

Setup Lefthook for pre-commit testing.

## Installation

**macOS:**
```bash
brew install lefthook
```

**Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/evilmartians/lefthook/master/install.sh | sh
```

**Windows:**
```powershell
choco install lefthook
```

## Setup

```bash
# Install hooks into .git/hooks
lefthook install

# Verify installation
lefthook check-install

# Run hooks manually
lefthook run pre-commit
```

## Configuration

See `lefthook-consumer-template.yml` in this folder for the example configuration. The `lefthook.yml` in the skill root is this repository's own pre-push configuration.

---

See LEFTHOOK.md in docs/ for full setup guide.
