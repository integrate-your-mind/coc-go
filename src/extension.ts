import { commands, ExtensionContext, LanguageClient, ServerOptions, workspace, services, LanguageClientOptions } from 'coc.nvim'
import { installGoBin, goBinPath, commandExists } from './utils/tools'
import { installGopls, installGomodifytags, installGotests, version, installGoplay } from './commands'
import { addTags, removeTags, clearTags } from './utils/modify-tags'
import { setStoragePath, GoConfig, GoplsOptions } from './utils/config'
import { activeTextDocument } from './editor'
import { GOPLS, GOMODIFYTAGS, GOTESTS } from './binaries'
import { generateTestsAll, generateTestsExported, toogleTests } from './utils/tests'
import { openPlayground } from './utils/playground'

export async function activate(context: ExtensionContext): Promise<void> {

  workspace.showMessage("LOCAL VERSION")

  setStoragePath(context.storagePath)

  const config = workspace.getConfiguration().get('go', {}) as GoConfig
  if (config.enable === false) {
    return
  }

  registerGeneral(context)

  registerGopls(context, config)
  registerTest(context)
  registerTags(context)
  registerPlaygroud(context)
}

async function registerGeneral(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand(
      "go.version",
      () => version()
    ),
  )
}


async function registerGopls(context: ExtensionContext, config: GoConfig): Promise<void> {
  const getGoplsPath = (): string => {
    if (config.commandPath) {
      workspace.showMessage("Go: Configuration 'go.commandPath' is deprected, use 'go.goplsPath' instead!", "warning")
      return config.commandPath
    }
    return config.goplsPath
  }

  const command = getGoplsPath() || await goBinPath(GOPLS)
  if (!await commandExists(command)) {
    if (!await installGoBin(GOPLS)) {
      return
    }
  }

  const serverOptions: ServerOptions = { command }
  const clientOptions: LanguageClientOptions = {
    documentSelector: ['go'],
    initializationOptions: () => workspace.getConfiguration().get('go.goplsOptions', {}) as GoplsOptions
  }

  const client = new LanguageClient('go', 'gopls', serverOptions, clientOptions)

  context.subscriptions.push(
    services.registLanguageClient(client),

    // restart gopls if options changed
    workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('go.goplsOptions')) {
        await client.stop()
        client.restart()
      }
    }),

    commands.registerCommand(
      "go.install.gopls",
      () => installGopls(client)
    )
  )
}

async function registerTest(context: ExtensionContext): Promise<void> {

  if (!await installGoBin(GOTESTS)) {
    return
  }

  context.subscriptions.push(
    commands.registerCommand(
      "go.install.gotests",
      () => installGotests()
    ),
    commands.registerCommand(
      "go.test.generate.file",
      async () => generateTestsAll(await activeTextDocument())
    ),
    commands.registerCommand(
      "go.test.generate.exported",
      async () => generateTestsExported(await activeTextDocument())
    ),
    commands.registerCommand(
      "go.test.toggle",
      async () => toogleTests(await activeTextDocument())
    ),
  )
}

async function registerTags(context: ExtensionContext): Promise<void> {
  if (!await installGoBin(GOMODIFYTAGS)) {
    return
  }

  context.subscriptions.push(
    commands.registerCommand(
      "go.install.gomodifytags",
      () => installGomodifytags()
    ),
    commands.registerCommand(
      "go.tags.add",
      async (...tags) => addTags(await activeTextDocument(), { tags })
    ),
    commands.registerCommand(
      "go.tags.add.line",
      async (...tags) => addTags(await activeTextDocument(), { tags, selection: "line" })
    ),
    commands.registerCommand(
      "go.tags.add.prompt",
      async () => addTags(await activeTextDocument(), { prompt: true })
    ),
    commands.registerCommand(
      "go.tags.remove",
      async (...tags) => removeTags(await activeTextDocument(), { tags })
    ),
    commands.registerCommand(
      "go.tags.remove.line",
      async (...tags) => removeTags(await activeTextDocument(), { tags, selection: "line" })
    ),
    commands.registerCommand(
      "go.tags.remove.prompt",
      async () => removeTags(await activeTextDocument(), { prompt: true })
    ),
    commands.registerCommand(
      "go.tags.clear",
      async () => clearTags(await activeTextDocument())
    ),
    commands.registerCommand(
      "go.tags.clear.line",
      async () => clearTags(await activeTextDocument(), { selection: "line" })
    ),
  )
}

async function registerPlaygroud(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand(
      "go.install.goplay",
      () => installGoplay()
    ),
    commands.registerCommand(
      "go.playground",
      async () => openPlayground(await activeTextDocument())
    )
  )
}
