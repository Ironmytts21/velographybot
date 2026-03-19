// @ts-ignore
import cron from 'node-cron';
import { createChildLogger } from './logger';

const log = createChildLogger('scheduler');

export interface ScheduledTask {
  name: string;
  expression: string;
  handler: () => Promise<void>;
  runOnStart?: boolean;
}

const tasks: cron.ScheduledTask[] = [];

export function registerTask(task: ScheduledTask): void {
  if (!cron.validate(task.expression)) {
    throw new Error(`Invalid cron expression for task "${task.name}": ${task.expression}`);
  }

  const scheduled = cron.schedule(
    task.expression,
    async () => {
      const start = Date.now();
      log.info({ task: task.name }, 'Running scheduled task');
      try {
        await task.handler();
        log.info({ task: task.name, durationMs: Date.now() - start }, 'Task completed');
      } catch (err) {
        log.error({ task: task.name, err }, 'Task failed');
      }
    },
    { scheduled: false },
  );

  tasks.push(scheduled);
  scheduled.start();

  if (task.runOnStart) {
    setImmediate(async () => {
      log.info({ task: task.name }, 'Running task on startup');
      try {
        await task.handler();
      } catch (err) {
        log.error({ task: task.name, err }, 'Startup task failed');
      }
    });
  }

  log.info({ task: task.name, expression: task.expression }, 'Task registered');
}

export function stopAllTasks(): void {
  tasks.forEach((t) => t.stop());
  log.info('All scheduled tasks stopped');
}
