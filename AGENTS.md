# 项目协作规范

## Git 提交与推送确认

- 每一次完整的功能实现完成后，必须先总结本次改动及测试、验证结果，再主动询问用户：**“本次功能已完成，是否需要我执行 Git commit 和 push？”**
- 未获得用户明确确认前，不得自行执行 `git commit` 或 `git push`。完成编码、测试通过或用户认可功能效果，不等于授权提交或推送。
- 确认时区分两项操作：用户只同意 commit 时，不得自动 push；涉及推送时，说明目标远程仓库和分支。
- 用户在当前请求中已明确要求提交或推送本次改动时，无需重复询问已授权的操作；该授权仅适用于本次，不延续到后续功能。
- 执行前检查 Git 仓库根目录、当前分支、远程地址和待提交差异，只提交本项目中与本次任务有关的内容，不夹带其他改动、凭据、依赖、构建产物或临时测试文件。
- 未经单独明确授权，不得强制推送、重写已发布历史或执行破坏性 Git 操作。推送冲突或失败时应如实说明，不擅自覆盖远程内容。
- 完成后报告提交摘要、提交哈希、推送目标及实际结果；未推送或推送失败时不得声称已同步远程。

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` |
| "See several related symbols' source at once" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture / trace questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->
