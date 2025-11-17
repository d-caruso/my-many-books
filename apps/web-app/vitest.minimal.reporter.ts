import { Reporter, File } from 'vitest/reporters'
import { relative } from 'pathe'

export default class MinimalReporter implements Reporter {
  onFinished(files: File[]) {
    const failed = files.flatMap(f =>
      f.tasks.flatMap(t =>
        t.tasks?.filter(st => st.result?.state === 'fail').map(st => ({ ...st, file: f })) ?? []
      )
    )

    if (!failed.length) return

    console.log('\nFailed tests:\n')

    for (const task of failed) {
      const filePath = relative(process.cwd(), task.file.filepath)
      //console.log(task.result?.errors)
      console.log('task.location')
      console.log(task.location)
      let line = ''

      // Try to extract line/column from location
      if (task.location?.line)
        line = `${task.location.line}:${task.location.column}`
      /*else if (error?.stack) {
        const match = error.stack.match(/\(([^)]+):(\d+):(\d+)\)/)
        if (match)
          line = `${match[2]}:${match[3]}`
      }*/

      console.log(`● ${task.name}`)
      console.log(`  File: ${filePath}${line ? ':' + line : ''}`)
      if (task.result?.errors) {
        const errors = task.result?.errors
        for (const error of errors) {
          //console.error(error.message)
          console.error(`  Cause: ${error.message}`)
        }
      }

      //console.error(`  Cause: ${task.result?.errors.message}`)
      console.log('')
    }
  }
}