# Lumiere for Claude

Connect Claude to your Lumiere workspace and use the Lumiere Research skill to find videos, explore audience feedback, compare results, and prepare evidence-based readouts.

This plugin combines a remote MCP connection with research instructions. It requires a Lumiere account and access to the workspaces you authorize. Installing it does not grant data access. The plugin is intended for Claude Code and Cowork; the separate Lumiere connector is available through Claude's Connectors Directory.

## Install in Claude Code

Add this repository as a marketplace, then install the plugin:

```text
/plugin marketplace add latitudelabs/lumiere-claude-plugin
/plugin install lumiere@lumiere-plugins
```

Follow the client's reload instructions. Open `/mcp`, select the Lumiere server, and complete OAuth sign-in and workspace authorization. Never paste credentials or access tokens into a conversation. If you already configured Lumiere separately, use one connection for the task to avoid duplicate tools.

Cowork users can use their organization's supported plugin installation flow. This repository is not a claim of acceptance into Anthropic's official plugin directory.

## Try it

- “Find our launch trailer in Lumiere and summarize its main message.”
- “What confused viewers about this video? Use comments and question responses.”
- “Where does this video lose viewers, and what happens at those moments?”
- “Compare the videos in our campaign channel. What should we test next?”

Replace names with content in your workspace. Claude can use the skill when relevant without you naming it. Results depend on the available content, responses, and your permissions. Check important findings against their source evidence.

## Data and permissions

The plugin connects to `https://lumiere.ai/app/api/mcp`. Each user authorizes their own account and workspaces. It retrieves existing data and can create temporary response exports when requested; it does not edit source videos or responses, publish dashboards, or launch recruitment. Data retrieved into Claude is subject to your organization's policies and the terms of the services you use.

If access expires or you need another workspace, reconnect and authorize the intended scope. The companion skill does not expand your permissions. For product support, use the support flow inside [Lumiere](https://lumiere.ai).

## Updates and contributions

This repository is generated from Latitude's private source of truth. Maintainers make changes there and publish an allowlisted snapshot as a release PR here. Do not edit generated files directly: open an issue describing the requested change instead. No private application history is copied into this repository.

`release.json` records the source commit identifier and SHA-256 hashes of the published files. The plugin version is in `.claude-plugin/plugin.json`. To update a Claude Code installation, refresh the marketplace and update the plugin through `/plugin`.

## License

The files in this repository are licensed under MIT. This license does not cover the hosted Lumiere service, its private implementation, or workspace content.

## Maintainer validation

Public validation and release automation use TypeScript on Bun 1.4.2. Run `bun scripts/validate-plugin.ts .` to check the exact distribution files and hashes. Research users do not need Python or Bun installed to use the remote connector; Bun is used by the repository's maintenance workflow.
