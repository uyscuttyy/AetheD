import { Queue, Worker, type ConnectionOptions } from "bullmq";
import type { VerificationJob, VerificationJobQueue } from "../../domain/src/index.js";

function connectionFromUrl(value: string): ConnectionOptions {
  const url = new URL(value);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") throw new Error("REDIS_URL must use redis:// or rediss://");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.pathname.length > 1 ? { db: Number(url.pathname.slice(1)) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {})
  };
}

export class BullMqVerificationQueue implements VerificationJobQueue {
  private readonly connection: ConnectionOptions;
  private readonly queue: Queue<VerificationJob>;

  constructor(redisUrl: string, queueName = "aethed-verification") {
    this.connection = connectionFromUrl(redisUrl);
    this.queue = new Queue(queueName, { connection: this.connection });
  }

  async enqueue(job: VerificationJob): Promise<void> {
    await this.queue.add("verify", job, {
      jobId: job.verificationId,
      attempts: 4,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000
    });
  }

  async consume(handler: (job: VerificationJob) => Promise<void>): Promise<void> {
    const worker = new Worker<VerificationJob>(
      this.queue.name,
      async job => handler(job.data),
      { connection: this.connection, concurrency: 2 }
    );
    await new Promise<void>((resolve, reject) => {
      worker.once("drained", resolve);
      worker.once("error", reject);
    });
    await worker.close();
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
