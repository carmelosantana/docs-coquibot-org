/**
 * sync-docs.mjs
 *
 * Syncs Coqui documentation and curated examples into the Nextra content/
 * tree and regenerates sidebar metadata.
 *
 * Sources:
 *   - ../../Core/coqui/docs/*.md
 *   - ../../Core/coqui/examples/**
 *   - ../../Core/coqui/README.md for landing pages
 *
 * Rules:
 *   - Sync only explicitly mapped Markdown docs from coqui/docs
 *   - Sync only explicitly curated examples from coqui/examples
 *   - Exclude php-agents, Postman collections, and other non-curated assets
 *   - Strip source frontmatter and generate Nextra frontmatter locally
 *   - Rewrite internal source links to local routes when a page exists
 *   - Rewrite other repository-relative links to GitHub URLs
 *   - Remove raw heading anchor tags that break Nextra TOC hydration
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const contentDir = path.join(projectRoot, 'content')
const defaultCoquiRoot = path.resolve(projectRoot, '..', '..', 'Core', 'coqui')
const coquiRoot = path.resolve(process.env.COQUI_REPO_ROOT || defaultCoquiRoot)
const coquiDocs = path.join(coquiRoot, 'docs')
const coquiExamples = path.join(coquiRoot, 'examples')
const coquiReadme = path.join(coquiRoot, 'README.md')
const coquiRepoUrl = (process.env.COQUI_REPO_URL || 'https://github.com/AgentCoqui/coqui').replace(/\/$/, '')

const isVercel = process.env.VERCEL === '1'
const forceSync = process.env.COQUI_SYNC_DOCS === '1'
const watchMode = process.argv.includes('--watch')
const skipInitial = process.argv.includes('--skip-initial')

const EXCLUDED_DOC_FILES = new Set(['AGENTS.md', 'CLAUDE.md'])
const WATCHABLE_EXTENSIONS = new Set(['.md', '.json', '.php'])
const SECTION_DIRS = [
  '',
  'features',
  'guides',
  'development',
  'examples',
  'examples/toolkit',
  'examples/preferences',
  'examples/profiles',
  'examples/skills',
]
const LEGACY_GENERATED_PATHS = [
  'commands.mdx',
  'configuration.mdx',
  'roles.mdx',
  'reference',
  'guides/building-apps.mdx',
  'guides/testing.mdx',
  'guides/toolkit-extensibility.mdx',
]

function repoPath(...parts) {
  return path.join(coquiRoot, ...parts)
}

function examplePath(...parts) {
  return path.join(coquiExamples, ...parts)
}

const DOC_ROUTES = [
  {
    sourcePath: repoPath('docs', 'FEATURES.md'),
    dest: 'features/index.mdx',
    title: 'Features',
    description: 'Comprehensive guide to everything Coqui can do.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'ARTIFACTS.md'),
    dest: 'features/artifacts.mdx',
    title: 'Artifacts',
    description: 'Versioned artifacts for plans, docs, and other structured outputs.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'CHANNELS.md'),
    dest: 'features/channels.mdx',
    title: 'Channels',
    description: 'Channel transports, conversation routing, and linked account setup.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'CHAT.md'),
    dest: 'features/chat.mdx',
    title: 'Chat Flow',
    description: 'How chat requests move through Coqui execution and storage.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'DATA_FLOW.md'),
    dest: 'features/data-flow.mdx',
    title: 'Data Flow',
    description: 'How projects, todos, artifacts, loops, and storage connect.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'LOOPS.md'),
    dest: 'features/loops.mdx',
    title: 'Loops',
    description: 'Automated multi-role iteration cycles and loop lifecycle.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'PROJECTS.md'),
    dest: 'features/projects.mdx',
    title: 'Projects and Sprints',
    description: 'Persistent project context and sprint organization in Coqui.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'TODOS.md'),
    dest: 'features/todos.mdx',
    title: 'Todos',
    description: 'Session-scoped task tracking and automation.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'ROLES.md'),
    dest: 'features/roles.mdx',
    title: 'Roles',
    description: 'Built-in agent roles, access levels, and custom role creation.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'PROFILES.md'),
    dest: 'features/profiles.mdx',
    title: 'Profiles',
    description: 'Personality profiles and customization.',
    section: 'features',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'COMMANDS.md'),
    dest: 'guides/commands.mdx',
    title: 'Commands',
    description: 'REPL slash commands and CLI subcommands reference.',
    section: 'guides',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'CONFIGURATION.md'),
    dest: 'guides/configuration.mdx',
    title: 'Configuration',
    description: 'openclaw.json configuration reference and setup.',
    section: 'guides',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'API.md'),
    dest: 'guides/api.mdx',
    title: 'HTTP API',
    description: 'Complete HTTP API reference for the Coqui server.',
    section: 'guides',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'BACKGROUND-TASKS.md'),
    dest: 'guides/background-tasks.mdx',
    title: 'Background Tasks',
    description: 'Run long-running agent work in separate processes.',
    section: 'guides',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'SKILLS.md'),
    dest: 'guides/skills.mdx',
    title: 'Skills',
    description: 'Create reusable instruction sets in plain Markdown.',
    section: 'guides',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'TOOLKITS.md'),
    dest: 'guides/extending.mdx',
    title: 'Creating Toolkits',
    description: 'Build and distribute Composer packages that extend Coqui.',
    section: 'guides',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'TESTING.md'),
    dest: 'development/testing.mdx',
    title: 'Testing',
    description: 'Test strategy, commands, and validation workflow.',
    section: 'development',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'TOOLKIT-EXTENSIBILITY.md'),
    dest: 'development/toolkit-extensibility.mdx',
    title: 'Toolkit Extensibility',
    description: 'Expose toolkit-provided REPL commands and extensions.',
    section: 'development',
    render: 'markdown',
  },
  {
    sourcePath: repoPath('docs', 'GITHUB-ACTIONS.md'),
    dest: 'development/ci.mdx',
    title: 'GitHub Actions',
    description: 'CI workflow for tests and static analysis.',
    section: 'development',
    render: 'markdown',
  },
]

const EXAMPLE_ROUTES = [
  {
    sourcePath: examplePath('hello-toolkit', 'README.md'),
    aliases: [
      examplePath('hello-toolkit'),
      examplePath('hello-toolkit', 'src'),
      examplePath('hello-toolkit', 'composer.json'),
      examplePath('hello-toolkit', 'src', 'HelloToolkit.php'),
    ],
    dest: 'examples/toolkit/hello-toolkit.mdx',
    title: 'Hello Toolkit',
    description: 'Minimal reference toolkit example with the key source files inline.',
    section: 'examples/toolkit',
    render: 'toolkit-example',
  },
  {
    sourcePath: examplePath('preferences', 'README.md'),
    aliases: [examplePath('preferences')],
    dest: 'examples/preferences/index.mdx',
    title: 'Preferences Overview',
    description: 'Copy-ready preference and security examples.',
    section: 'examples/preferences',
    render: 'markdown',
    stripFirstHeading: true,
  },
  {
    sourcePath: examplePath('preferences', 'commercial-operator.json'),
    dest: 'examples/preferences/commercial-operator.mdx',
    title: 'Commercial Operator',
    description: 'High-autonomy preferences example.',
    section: 'examples/preferences',
    render: 'code-example',
    language: 'json',
    lead: 'Copy this file into `profiles/your-profile/preferences.json` when you want an outcome-first operator.',
  },
  {
    sourcePath: examplePath('preferences', 'deliberate-operator.json'),
    dest: 'examples/preferences/deliberate-operator.mdx',
    title: 'Deliberate Operator Preferences',
    description: 'Measured, planning-heavy preferences example.',
    section: 'examples/preferences',
    render: 'code-example',
    language: 'json',
    lead: 'Copy this file into `profiles/your-profile/preferences.json` when you want a deliberate operator profile.',
  },
  {
    sourcePath: examplePath('preferences', 'review-heavy.json'),
    dest: 'examples/preferences/review-heavy.mdx',
    title: 'Review Heavy',
    description: 'Lean review-focused preferences example.',
    section: 'examples/preferences',
    render: 'code-example',
    language: 'json',
    lead: 'Copy this file into `profiles/your-profile/preferences.json` for a terse, review-focused operator.',
  },
  {
    sourcePath: examplePath('preferences', 'security-cautious.md'),
    dest: 'examples/preferences/security-cautious.mdx',
    title: 'Security Cautious',
    description: 'Strong-guardrail security override example.',
    section: 'examples/preferences',
    render: 'code-example',
    language: 'md',
    lead: 'Use this as `profiles/your-profile/security.md` when you want tighter approval boundaries.',
  },
  {
    sourcePath: examplePath('preferences', 'security-high-autonomy.md'),
    dest: 'examples/preferences/security-high-autonomy.mdx',
    title: 'Security High Autonomy',
    description: 'Fast-execution security override example.',
    section: 'examples/preferences',
    render: 'code-example',
    language: 'md',
    lead: 'Use this as `profiles/your-profile/security.md` when you want faster execution with explicit risk boundaries.',
  },
  {
    sourcePath: examplePath('profiles', 'deliberate-operator', 'soul.md'),
    aliases: [
      examplePath('profiles', 'deliberate-operator'),
      examplePath('profiles', 'deliberate-operator', 'backstory.md'),
      examplePath('profiles', 'deliberate-operator', 'preferences.json'),
      examplePath('profiles', 'deliberate-operator', 'security.md'),
      examplePath('profiles', 'deliberate-operator', 'samples'),
      examplePath('profiles', 'deliberate-operator', 'samples', 'responses', 'status-update.md'),
    ],
    dest: 'examples/profiles/deliberate-operator.mdx',
    title: 'Deliberate Operator',
    description: 'Complete profile example with soul, backstory, preferences, security, and sample response.',
    section: 'examples/profiles',
    render: 'profile-example',
  },
  {
    sourcePath: examplePath('say-hello', 'SKILL.md'),
    aliases: [examplePath('say-hello')],
    dest: 'examples/skills/say-hello.mdx',
    title: 'Say Hello',
    description: 'Minimal skill example that teaches a greeting workflow.',
    section: 'examples/skills',
    render: 'code-example',
    language: 'md',
    lead: 'Copy this file into a skill directory to create a simple greeting skill.',
  },
]

const routesBySection = new Map([
  ['features', DOC_ROUTES.filter(route => route.section === 'features')],
  ['guides', DOC_ROUTES.filter(route => route.section === 'guides')],
  ['development', DOC_ROUTES.filter(route => route.section === 'development')],
])

const exampleRoutesBySection = new Map([
  ['examples/toolkit', EXAMPLE_ROUTES.filter(route => route.section === 'examples/toolkit')],
  ['examples/preferences', EXAMPLE_ROUTES.filter(route => route.section === 'examples/preferences')],
  ['examples/profiles', EXAMPLE_ROUTES.filter(route => route.section === 'examples/profiles')],
  ['examples/skills', EXAMPLE_ROUTES.filter(route => route.section === 'examples/skills')],
])

const allRoutes = [...DOC_ROUTES, ...EXAMPLE_ROUTES]
const routePathBySourcePath = new Map(
  allRoutes.flatMap(route => collectRouteSources(route).map(source => [path.resolve(source), routePath(route.dest)]))
)

function collectRouteSources(route) {
  return [route.sourcePath, ...(route.aliases || [])]
}

function routePath(dest) {
  const withoutExt = dest.replace(/\.mdx$/, '')
  return `/${withoutExt.replace(/\/index$/, '')}`
}

function repoUrlForPath(absPath) {
  const relative = path.relative(coquiRoot, absPath).replace(/\\/g, '/')
  const exists = fs.existsSync(absPath)
  const isDir = exists ? fs.statSync(absPath).isDirectory() : false
  const base = isDir ? 'tree' : 'blob'
  return `${coquiRepoUrl}/${base}/main/${relative}`
}

function yamlString(value) {
  return JSON.stringify(value)
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n*/u, '')
}

function stripLeadingH1(content) {
  return content.replace(/^# .+\n+/, '')
}

function stripHeadingAnchorTags(content) {
  return content.replace(/^(#{1,6})\s+<a id=(['"]).*?\2><\/a>\s*/gm, '$1 ')
}

function stripHtmlComments(content) {
  return content.replace(/<!--([\s\S]*?)-->/g, '')
}

function processReadme(content) {
  let cleaned = stripHtmlComments(content)
  cleaned = cleaned.replace(/^<p align="center">\s*\n\s*<picture>[\s\S]*?<\/picture>\s*\n\s*<\/p>\s*\n*/m, '')
  cleaned = cleaned.replace(/^<p align="center">[\s\S]*?<\/p>\s*\n*/gm, '')
  cleaned = cleaned.replace(/^# .+\n+/, '')
  cleaned = cleaned.replace(/^> \*\*Book a 1:1 call\*\*[\s\S]*?\n\n/m, '')
  return cleaned
}

function normalizeInlineCodeAngles(value) {
  return value.replace(/</g, '‹').replace(/>/g, '›')
}

function escapeMdxUnsafeAngles(content) {
  return content
    .split(/(```[\s\S]*?```)/g)
    .map(segment => {
      if (segment.startsWith('```')) {
        return segment
      }

      return segment
        .split(/(`[^`\n]*`)/g)
        .map(part => {
          if (part.startsWith('`')) {
            return part.includes('<') || part.includes('>')
              ? `\`${normalizeInlineCodeAngles(part.slice(1, -1))}\``
              : part
          }

          return part
            .replace(/<([A-Za-z0-9][A-Za-z0-9_|,.:@/-]*)>/g, (_match, value) => `&lt;${value}&gt;`)
            .replace(/<\/([A-Za-z0-9][A-Za-z0-9_|,.:@/-]*)>/g, (_match, value) => `&lt;/${value}&gt;`)
        })
        .join('')
    })
    .join('')
}

function convertGitHubAlerts(content) {
  let needsImport = false

  const alertTypeMap = {
    NOTE: 'info',
    TIP: 'info',
    IMPORTANT: 'warning',
    WARNING: 'warning',
    CAUTION: 'error',
  }

  const alertRegex = /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:>.*\n?)*)/gm

  const replaced = content.replace(alertRegex, (_match, type, body) => {
    needsImport = true
    const cleanBody = body
      .split('\n')
      .map(line => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim()

    return `<Callout type="${alertTypeMap[type] || 'info'}">\n${cleanBody}\n</Callout>\n`
  })

  if (!needsImport || /import\s+\{\s*Callout\s*\}\s+from\s+'nextra\/components'/.test(replaced)) {
    return replaced
  }

  return `import { Callout } from 'nextra/components'\n\n${replaced}`
}

function rewriteSourceLinks(content, sourcePath) {
  return content.replace(/\]\(([^)\s]+)(#[^)]+)?\)/g, (match, target, anchor = '') => {
    if (/^(https?:|mailto:|tel:|\/|#)/.test(target)) {
      return match
    }

    const resolved = path.resolve(path.dirname(sourcePath), target.replace(/\/$/, ''))
    const internalRoute = routePathBySourcePath.get(resolved)
    if (internalRoute) {
      return `](${internalRoute}${anchor})`
    }

    if (resolved.startsWith(coquiRoot)) {
      return `](${repoUrlForPath(resolved)}${anchor})`
    }

    return match
  })
}

function processMarkdown(content, sourcePath, options = {}) {
  let processed = stripFrontmatter(content)
  if (options.stripFirstHeading) {
    processed = stripLeadingH1(processed)
  }
  processed = stripHtmlComments(processed)
  processed = stripHeadingAnchorTags(processed)
  processed = escapeMdxUnsafeAngles(processed)
  processed = convertGitHubAlerts(processed)
  processed = rewriteSourceLinks(processed, sourcePath)
  return processed.trim()
}

function extractTopLevelSection(content, headingPattern) {
  const lines = content.split('\n')
  const headingRegex = new RegExp(`^## (?:${headingPattern})\\s*$`)
  let insideFence = false
  let startIndex = -1

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const trimmed = line.trim()

    if (/^`{3,}/.test(trimmed)) {
      insideFence = !insideFence
    }

    if (!insideFence && headingRegex.test(line)) {
      startIndex = index + 1
      break
    }
  }

  if (startIndex === -1) {
    return null
  }

  const sectionLines = []
  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index]
    const trimmed = line.trim()

    if (/^`{3,}/.test(trimmed)) {
      insideFence = !insideFence
      sectionLines.push(line)
      continue
    }

    if (!insideFence && /^(##|#)\s+/.test(line)) {
      break
    }

    sectionLines.push(line)
  }

  return sectionLines.join('\n').trim()
}

function buildFrontmatter(route) {
  const lines = ['---', `title: ${yamlString(route.title)}`]
  if (route.description) {
    lines.push(`description: ${yamlString(route.description)}`)
  }
  lines.push('---', '', '')
  return lines.join('\n')
}

function fenceFor(content) {
  return content.includes('```') ? '````' : '```'
}

function codeFence(content, language = '') {
  const fence = fenceFor(content)
  return `${fence}${language}\n${content.trimEnd()}\n${fence}`
}

function markdownSourceLink(absPath, label) {
  return `[${label}](${repoUrlForPath(absPath)})`
}

function buildMarkdownPage(route) {
  const raw = readText(route.sourcePath)
  return `${buildFrontmatter(route)}${processMarkdown(raw, route.sourcePath, { stripFirstHeading: route.stripFirstHeading })}\n`
}

function buildCodeExamplePage(route) {
  const raw = readText(route.sourcePath)
  const relative = path.relative(coquiRoot, route.sourcePath).replace(/\\/g, '/')
  const lines = [
    buildFrontmatter(route),
    route.lead,
    '',
    `Source: ${markdownSourceLink(route.sourcePath, relative)}`,
    '',
    codeFence(raw, route.language),
    '',
  ]
  return lines.join('\n')
}

function buildToolkitExamplePage(route) {
  const readme = processMarkdown(readText(route.sourcePath), route.sourcePath, { stripFirstHeading: true })
  const composerPath = examplePath('hello-toolkit', 'composer.json')
  const toolkitPath = examplePath('hello-toolkit', 'src', 'HelloToolkit.php')
  const rootPath = examplePath('hello-toolkit')
  const srcPath = examplePath('hello-toolkit', 'src')

  const lines = [
    buildFrontmatter(route),
    readme,
    '',
    '## Source Files',
    '',
    `- ${markdownSourceLink(rootPath, 'examples/hello-toolkit/')}`,
    `- ${markdownSourceLink(srcPath, 'examples/hello-toolkit/src/')}`,
    `- ${markdownSourceLink(composerPath, 'examples/hello-toolkit/composer.json')}`,
    `- ${markdownSourceLink(route.sourcePath, 'examples/hello-toolkit/README.md')}`,
    `- ${markdownSourceLink(toolkitPath, 'examples/hello-toolkit/src/HelloToolkit.php')}`,
    '',
    '## composer.json',
    '',
    codeFence(readText(composerPath), 'json'),
    '',
    '## HelloToolkit.php',
    '',
    codeFence(readText(toolkitPath), 'php'),
    '',
  ]

  return lines.join('\n')
}

function buildProfileExamplePage(route) {
  const profileDir = examplePath('profiles', 'deliberate-operator')
  const sampleDir = examplePath('profiles', 'deliberate-operator', 'samples')
  const backstoryPath = examplePath('profiles', 'deliberate-operator', 'backstory.md')
  const preferencesPath = examplePath('profiles', 'deliberate-operator', 'preferences.json')
  const securityPath = examplePath('profiles', 'deliberate-operator', 'security.md')
  const sampleResponsePath = examplePath('profiles', 'deliberate-operator', 'samples', 'responses', 'status-update.md')

  const lines = [
    buildFrontmatter(route),
    'This example profile bundles a soul, backstory, preferences, security guidance, and one sample response so you can see how a complete profile hangs together.',
    '',
    '## Source Files',
    '',
    `- ${markdownSourceLink(profileDir, 'examples/profiles/deliberate-operator/')}`,
    `- ${markdownSourceLink(sampleDir, 'examples/profiles/deliberate-operator/samples/')}`,
    `- ${markdownSourceLink(route.sourcePath, 'examples/profiles/deliberate-operator/soul.md')}`,
    `- ${markdownSourceLink(backstoryPath, 'examples/profiles/deliberate-operator/backstory.md')}`,
    `- ${markdownSourceLink(preferencesPath, 'examples/profiles/deliberate-operator/preferences.json')}`,
    `- ${markdownSourceLink(securityPath, 'examples/profiles/deliberate-operator/security.md')}`,
    `- ${markdownSourceLink(sampleResponsePath, 'examples/profiles/deliberate-operator/samples/responses/status-update.md')}`,
    '',
    '## soul.md',
    '',
    codeFence(readText(route.sourcePath), 'md'),
    '',
    '## backstory.md',
    '',
    codeFence(readText(backstoryPath), 'md'),
    '',
    '## preferences.json',
    '',
    codeFence(readText(preferencesPath), 'json'),
    '',
    '## security.md',
    '',
    codeFence(readText(securityPath), 'md'),
    '',
    '## Sample Response',
    '',
    processMarkdown(readText(sampleResponsePath), sampleResponsePath, { stripFirstHeading: true }),
    '',
  ]

  return lines.join('\n')
}

function buildPage(route) {
  switch (route.render) {
    case 'toolkit-example':
      return buildToolkitExamplePage(route)
    case 'profile-example':
      return buildProfileExamplePage(route)
    case 'code-example':
      return buildCodeExamplePage(route)
    case 'markdown':
      return buildMarkdownPage(route)
    default:
      throw new Error(`Unsupported route renderer: ${route.render}`)
  }
}

function writeRoute(route) {
  const destPath = path.join(contentDir, route.dest)
  ensureDir(path.dirname(destPath))
  fs.writeFileSync(destPath, buildPage(route), 'utf8')
  console.log(`  ✓ ${path.relative(coquiRoot, route.sourcePath).replace(/\\/g, '/')} -> ${route.dest}`)
}

function syncLandingPages() {
  if (!fs.existsSync(coquiReadme)) {
    return 0
  }

  let readmeContent = processReadme(readText(coquiReadme))
  readmeContent = processMarkdown(readmeContent, coquiReadme)

  const indexContent = `---\ntitle: ${yamlString('Coqui Docs')}\n---\n\n${readmeContent}\n`
  fs.writeFileSync(path.join(contentDir, 'index.mdx'), indexContent, 'utf8')
  console.log('  ✓ README.md -> index.mdx')

  const gettingStartedSection = extractTopLevelSection(readmeContent, 'Quick Start|Installation|Getting Started')
  const gettingStarted = gettingStartedSection
    ? gettingStartedSection
    : 'See the [Introduction](/) for installation and quick start instructions.'

  const gettingStartedContent = `---\ntitle: ${yamlString('Getting Started')}\n---\n\n# Getting Started\n\n${gettingStarted}\n`
  fs.writeFileSync(path.join(contentDir, 'getting-started.mdx'), gettingStartedContent, 'utf8')
  console.log('  ✓ README.md -> getting-started.mdx')

  return 2
}

function writeMetaFile(relativePath, entries) {
  const lines = ['export default {']
  for (const [key, value] of entries) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  }
  lines.push('}')

  fs.writeFileSync(path.join(contentDir, relativePath), `${lines.join('\n')}\n`, 'utf8')
}

function slugForRoute(route) {
  return path.basename(route.dest, '.mdx')
}

function writeMetaFiles() {
  const rootEntries = []

  if (fs.existsSync(path.join(contentDir, 'index.mdx'))) {
    rootEntries.push(['index', 'Introduction'])
  }

  if (fs.existsSync(path.join(contentDir, 'getting-started.mdx'))) {
    rootEntries.push(['getting-started', 'Getting Started'])
  }

  rootEntries.push(['features', 'Features'])
  rootEntries.push(['guides', 'Guides'])
  rootEntries.push(['development', 'Development'])
  rootEntries.push(['examples', 'Examples'])

  writeMetaFile('_meta.js', rootEntries)
  writeMetaFile('features/_meta.js', routesBySection.get('features').map(route => [slugForRoute(route), route.dest.endsWith('/index.mdx') ? 'Overview' : route.title]))
  writeMetaFile('guides/_meta.js', routesBySection.get('guides').map(route => [slugForRoute(route), route.title]))
  writeMetaFile('development/_meta.js', routesBySection.get('development').map(route => [slugForRoute(route), route.title]))
  writeMetaFile('examples/_meta.js', [
    ['toolkit', 'Toolkit'],
    ['profiles', 'Profiles'],
    ['preferences', 'Preferences'],
    ['skills', 'Skills'],
  ])
  writeMetaFile('examples/toolkit/_meta.js', [['hello-toolkit', 'Hello Toolkit']])
  writeMetaFile('examples/profiles/_meta.js', [['deliberate-operator', 'Deliberate Operator']])
  writeMetaFile('examples/preferences/_meta.js', exampleRoutesBySection.get('examples/preferences').map(route => [slugForRoute(route), route.dest.endsWith('/index.mdx') ? 'Overview' : route.title]))
  writeMetaFile('examples/skills/_meta.js', [['say-hello', 'Say Hello']])
}

function validateSourceDocs() {
  if (!fs.existsSync(coquiDocs)) {
    throw new Error(`Coqui docs directory not found at ${coquiDocs}`)
  }

  const docsInRoot = fs.readdirSync(coquiDocs, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => name.endsWith('.md'))
    .filter(name => !EXCLUDED_DOC_FILES.has(name))
    .sort()

  const mappedFiles = DOC_ROUTES.map(route => path.basename(route.sourcePath)).sort()
  const missingMappings = docsInRoot.filter(name => !mappedFiles.includes(name))
  const missingSources = DOC_ROUTES.filter(route => !fs.existsSync(route.sourcePath)).map(route => path.relative(coquiRoot, route.sourcePath).replace(/\\/g, '/'))
  const missingExampleSources = EXAMPLE_ROUTES.filter(route => !fs.existsSync(route.sourcePath)).map(route => path.relative(coquiRoot, route.sourcePath).replace(/\\/g, '/'))

  if (missingMappings.length > 0) {
    throw new Error(`New docs require route mappings: ${missingMappings.join(', ')}`)
  }

  if (missingSources.length > 0) {
    throw new Error(`Mapped docs missing from source: ${missingSources.join(', ')}`)
  }

  if (missingExampleSources.length > 0) {
    throw new Error(`Curated example sources missing: ${missingExampleSources.join(', ')}`)
  }
}

function pruneLegacyOutputs() {
  for (const relativePath of LEGACY_GENERATED_PATHS) {
    const fullPath = path.join(contentDir, relativePath)
    if (!fs.existsSync(fullPath)) {
      continue
    }

    fs.rmSync(fullPath, { recursive: true, force: true })
    console.log(`  ⊘ removed legacy generated path ${relativePath}`)
  }
}

function syncDocsOnce() {
  console.log('Syncing Coqui docs and examples to Nextra content/...\n')

  validateSourceDocs()

  for (const dir of SECTION_DIRS) {
    ensureDir(path.join(contentDir, dir))
  }

  pruneLegacyOutputs()

  let syncedCount = syncLandingPages()

  for (const route of DOC_ROUTES) {
    writeRoute(route)
    syncedCount += 1
  }

  for (const route of EXAMPLE_ROUTES) {
    writeRoute(route)
    syncedCount += 1
  }

  writeMetaFiles()

  console.log(`\nDone. Synced ${syncedCount} pages.`)
}

function collectDirectories(rootDir) {
  const dirs = [rootDir]
  if (!fs.existsSync(rootDir)) {
    return dirs
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    dirs.push(...collectDirectories(path.join(rootDir, entry.name)))
  }

  return dirs
}

function startWatchMode() {
  let debounceTimer = null
  const watchers = []

  const queueSync = reason => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      console.log(`\nDetected source change (${reason}). Re-syncing...\n`)
      try {
        syncDocsOnce()
      } catch (error) {
        console.error(`\nDocs sync failed: ${error.message}`)
      }
    }, 150)
  }

  const watchDirs = [
    ...collectDirectories(coquiDocs),
    ...collectDirectories(coquiExamples),
  ]

  for (const dir of watchDirs) {
    const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
      if (!filename) {
        queueSync(`${eventType}:${path.basename(dir)}`)
        return
      }

      const extension = path.extname(filename).toLowerCase()
      if (!WATCHABLE_EXTENSIONS.has(extension)) {
        return
      }

      queueSync(`${eventType}:${filename}`)
    })
    watchers.push(watcher)
  }

  const readmeWatcher = fs.watch(coquiReadme, { persistent: true }, eventType => {
    queueSync(`${eventType}:README.md`)
  })
  watchers.push(readmeWatcher)

  console.log(`Watching ${coquiDocs}, ${coquiExamples}, and README.md for source changes...`)

  const stopWatching = () => {
    for (const watcher of watchers) {
      watcher.close()
    }
  }

  process.on('SIGINT', stopWatching)
  process.on('SIGTERM', stopWatching)
}

if (isVercel && !forceSync) {
  console.log('Skipping docs sync on Vercel (using committed content/ files).')
  console.log('Set COQUI_SYNC_DOCS=1 to force sync in this environment.')
  process.exit(0)
}

try {
  if (!skipInitial) {
    syncDocsOnce()
  }

  if (watchMode) {
    startWatchMode()
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`)
  process.exit(1)
}
