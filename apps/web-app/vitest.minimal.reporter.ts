import { Reporter, File } from 'vitest/reporters'
import { relative } from 'pathe'
import { logger } from './src/utils/logger'

export default class MinimalReporter implements Reporter {
  onFinished(files: File[]) {
    const failed = files.flatMap(f =>
      f.tasks.flatMap(t =>
        t.tasks?.filter(st => st.result?.state === 'fail').map(st => ({ ...st, file: f })) ?? []
      )
    )

    if (!failed.length) return

    logger.error('\nFailed tests:\n')

    for (const task of failed) {
      const filePath = relative(process.cwd(), task.file.filepath)
      let line = ''

      // Try to extract line/column from location
      if (task.location?.line)
        line = `${task.location.line}:${task.location.column}`
      /*else if (error?.stack) {
        const match = error.stack.match(/\(([^)]+):(\d+):(\d+)\)/)
        if (match)
          line = `${match[2]}:${match[3]}`
      }*/

      logger.error(`● ${task.name}`)
      logger.error(`  File: ${filePath}${line ? ':' + line : ''}`)
      if (task.result?.errors) {
        const errors = task.result?.errors
        for (const error of errors) {
          logger.error(`  Cause: ${error.message}`)
        }
      }

      logger.error('')
    }
  }
}
