# Workers Monorepo Example

For tasks to work with Mise, add this to ~/.zprofile:

```shell
eval "$($HOME/.local/bin/mise activate zsh --shims)"
```

## How To Deploy

Ensure deps are installed:

```shell
pnpm install
```

```shell
pnpm turbo deploy
```
