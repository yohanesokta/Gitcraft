for file in \
  CLAUDE.md \
  QWEN.md \
  KILO.md \
  CLINE.md \
  WINDSURF.md \
  COPILOT.md \
  CURSOR.md \
  AIDER.md \
  TRAE.md \
  opencode.md \
  AGENT.md; do
  ln -s AGENTS.md "$file"
done
