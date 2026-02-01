# Project Creation Workflow

## Metadata
- **Skill**: project
- **Workflow**: create
- **Estimated Time**: 20-30 seconds
- **Model Complexity**: STANDARD

## Description
Create a new project with proper structure, tooling, and configuration based on user preferences and best practices.

## Purpose
- Scaffold new projects quickly
- Apply consistent structure and tooling
- Include best practices by default
- Save setup time and mental overhead

## User Preferences (from identity)
- Preferred tech stack
- Code style preferences
- Testing preferences
- Documentation level

## Steps

### 1. Parse Project Request

```prompt
The user wants to create a new project.

User Request: {{query}}

User Tech Preferences:
{{#if tech_preferences}}
{{tech_preferences}}
{{else}}
No specific preferences set.
{{/if}}

Analyze the request to determine:
1. Project type (CLI, web app, API, library, etc.)
2. Primary language/framework
3. Key features needed
4. Scope (MVP, full, experiment)

Response Format (JSON):
{
  "project_name": "suggested-name",
  "project_type": "cli|webapp|api|library|script|other",
  "language": "typescript|python|go|rust|other",
  "framework": "Framework if applicable",
  "key_features": ["feature1", "feature2"],
  "scope": "mvp|full|experiment",
  "questions": [
    {
      "question": "Clarifying question if needed",
      "options": ["option1", "option2"]
    }
  ]
}
```

### 2. Select Template
Based on analysis, choose appropriate template:
- TypeScript CLI
- TypeScript Library
- Next.js Web App
- Express API
- Python CLI
- Python Package
- Custom

### 3. Generate Project Structure

```prompt
Generate the project structure for:

Project: {{project_name}}
Type: {{project_type}}
Language: {{language}}
Framework: {{framework}}
Features: {{features}}
Scope: {{scope}}

User Preferences:
{{preferences}}

Create a comprehensive project structure that includes:
1. Source directory layout
2. Configuration files
3. Testing setup
4. Documentation
5. Git configuration
6. Package management
7. Linting/formatting
8. CI/CD basics (optional)

Response Format (JSON):
{
  "structure": {
    "directories": ["src", "tests", "docs"],
    "files": [
      {
        "path": "path/to/file",
        "description": "What this file is for",
        "template": "Template name or content summary"
      }
    ]
  },
  "setup_commands": [
    {
      "command": "Command to run",
      "description": "What it does"
    }
  ],
  "config_files": [
    {
      "name": "package.json",
      "purpose": "Package configuration",
      "key_settings": ["setting1", "setting2"]
    }
  ],
  "next_steps": ["Step 1", "Step 2", "Step 3"],
  "gotchas": ["Things to be aware of"]
}
```

### 4. Provide Setup Instructions
Clear, actionable setup steps:
- Commands to run
- Configuration to adjust
- Initial files to modify

### 5. Add to User's Projects
Optionally add to identity.yaml projects list.

## Output Format

```markdown
## New Project: {{project_name}}

*Type: {{project_type}} | Language: {{language}}*

---

### Project Structure

```
{{project_name}}/
├── src/
│   └── ...
├── tests/
│   └── ...
├── package.json
├── tsconfig.json
├── README.md
└── ...
```

---

### Setup Commands

```bash
# Create directory
mkdir {{project_name}} && cd {{project_name}}

# Initialize
{{init_command}}

# Install dependencies
{{install_command}}

# Additional setup
{{setup_commands}}
```

---

### Key Configuration Files

| File | Purpose |
|------|---------|
| package.json | Dependencies and scripts |
| tsconfig.json | TypeScript configuration |
| ... | ... |

---

### Next Steps

1. [ ] {{step_1}}
2. [ ] {{step_2}}
3. [ ] {{step_3}}

---

### Tips

- {{tip_1}}
- {{tip_2}}

---

*Project scaffolded | Add to your projects: 'identity add-project {{project_name}}'*
```

## Templates Available

### TypeScript CLI
- Commander.js for CLI
- Biome for linting
- Vitest for testing
- Strict TypeScript

### TypeScript Library
- Dual CJS/ESM build
- TypeDoc documentation
- Vitest for testing
- NPM publishing ready

### Next.js Web App
- App Router
- Tailwind CSS
- TypeScript
- Testing setup

### Express API
- TypeScript
- Structured routes
- Validation (Zod)
- Testing setup

### Python CLI
- Click for CLI
- pytest for testing
- pyproject.toml
- Type hints

## Error Handling
- **Unclear requirements**: Ask clarifying questions
- **Unsupported stack**: Suggest closest supported option
- **Missing preferences**: Use sensible defaults
